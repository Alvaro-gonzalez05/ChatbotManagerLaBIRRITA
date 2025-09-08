import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Get all automations for a business
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params

    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching automations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Execute a specific automation for testing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params
    const { automationId } = await request.json()

    if (!automationId) {
      return NextResponse.json({ error: 'automation_id is required' }, { status: 400 })
    }

    // Get the automation details
    const { data: automation, error: automationError } = await supabase
      .from('automations')
      .select('*')
      .eq('id', automationId)
      .eq('business_id', businessId)
      .single()

    if (automationError || !automation) {
      return NextResponse.json({ error: 'Automation not found' }, { status: 404 })
    }

    console.log('🔍 Automation details:', {
      id: automation.id,
      name: automation.name,
      type: automation.automation_type,
      is_active: automation.is_active,
      meta_template_name: automation.meta_template_name,
      message_template: automation.message_template
    })

    // Check if automation is active (temporarily disabled for testing)
    console.log(`⚠️ Automation active status: ${automation.is_active} (type: ${typeof automation.is_active})`)
    // if (!automation.is_active) {
    //   return NextResponse.json({ error: 'Automation is not active - please activate it first' }, { status: 400 })
    // }

    // Get customers for this business to test with
    let { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)

    console.log(`🔍 Database query results:`)
    console.log(`  - Error: ${customersError?.message || 'None'}`)
    console.log(`  - Customers found: ${customers?.length || 0}`)
    
    if (customers && customers.length > 0) {
      console.log(`📋 All customers:`)
      customers.forEach((customer, index) => {
        console.log(`  ${index + 1}. ${customer.name} - Phone: ${customer.phone} - Birthday: ${customer.birthday}`)
      })
    }

    if (customersError) {
      return NextResponse.json({ error: 'Error fetching customers: ' + customersError.message }, { status: 500 })
    }

    // For birthday automation, filter customers with upcoming birthdays
    if (automation.automation_type === 'birthday' && customers && customers.length > 0) {
      const today = new Date()
      const triggerDays = automation.trigger_days || 7
      
      console.log(`📅 Today: ${today.toISOString().split('T')[0]}, Trigger days: ${triggerDays}`)
      console.log(`👥 Total customers to check: ${customers.length}`)
      
      customers = customers.filter(customer => {
        if (!customer.birthday) {
          console.log(`⚠️ Customer ${customer.name}: No birthday field`)
          return false
        }
        
        const birthDate = new Date(customer.birthday)
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
        
        // If birthday already passed this year, check next year
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1)
        }
        
        const daysDifference = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        console.log(`👤 Customer ${customer.name}: birthday=${customer.birthday}, thisYearBirthday=${thisYearBirthday.toISOString().split('T')[0]}, days_until_birthday=${daysDifference}, trigger_days=${triggerDays}, match=${daysDifference === triggerDays}`)
        
        return daysDifference === triggerDays
      })
      
      console.log(`🎂 Found ${customers.length} customers with birthdays in ${triggerDays} days`)
    }

    let testCustomer
    if (!customers || customers.length === 0) {
      console.log('No eligible customers found, using test customer')
      // Use a test customer if no real customers are eligible
      testCustomer = {
        id: 'test-customer-id',
        name: 'Test Customer',
        phone: '5492616977056', // Using Alva's real authorized number
        email: null,
        birthday: null,
        address: null,
        business_id: businessId,
        points: 100
      }
    } else {
      testCustomer = customers[0]
      console.log(`✅ Using real customer: ${testCustomer.name} with birthday on ${testCustomer.birth_date}`)
    }

    console.log('👤 Test customer:', {
      name: testCustomer.name,
      phone: testCustomer.phone,
      points: testCustomer.points
    })

    // Execute the automation based on its type
    let result = null
    switch (automation.automation_type) {
      case 'birthday':
        // Simulate birthday automation
        result = await executeBirthdayAutomation(automation, testCustomer)
        break
      case 'inactive_customers':
        // Simulate inactive customer automation
        result = await executeInactiveCustomerAutomation(automation, testCustomer)
        break
      case 'missing_field':
        // Simulate missing fields automation
        result = await executeMissingFieldsAutomation(automation, testCustomer)
        break
      case 'points_notification':
        // Simulate points notification automation
        result = await executePointsLoadingAutomation(automation, testCustomer)
        break
      default:
        return NextResponse.json({ error: `Unknown automation type: ${automation.automation_type}` }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Automation ${automation.name} executed successfully`,
      automation: {
        name: automation.name,
        type: automation.automation_type,
        template: automation.meta_template_name
      },
      testCustomer: {
        name: testCustomer.name,
        phone: testCustomer.phone
      },
      result 
    })

  } catch (error: any) {
    console.error('Error executing automation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper functions for different automation types
async function executeBirthdayAutomation(automation: any, customer: any) {
  // Send actual WhatsApp birthday message
  try {
    // Use fallback template name if meta_template_name is null
    const templateName = automation.meta_template_name || 'birthday_reminder'
    
    console.log(`🎂 Sending birthday message to ${customer.name} (${customer.phone})`)
    console.log(`📋 Template: ${templateName} (fallback used: ${!automation.meta_template_name})`)
    
    const url = `http://localhost:3000/api/whatsapp/send-template`
    console.log(`🔗 URL: ${url}`)
    
    const payload = {
      to: customer.phone,
      templateName: templateName,
      parameters: [
        customer.name,                                    // {{1}} - Nombre del cliente (header)
        "🎂 ¡Promoción especial de cumpleaños!",         // {{1}} - Título/descripción de la promoción (body)
        "50"                                              // {{2}} - Puntos de regalo (body)
      ]
    }
    console.log(`📦 Payload:`, payload)

    const whatsappResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const responseText = await whatsappResponse.text()
    console.log(`📨 Response status: ${whatsappResponse.status}`)
    console.log(`📨 Response body: ${responseText}`)

    if (whatsappResponse.ok) {
      console.log(`✅ Birthday message sent to ${customer.name} (${customer.phone})`)
      return { 
        message: `Birthday message sent to ${customer.name}`, 
        type: 'birthday',
        success: true,
        phone: customer.phone
      }
    } else {
      console.log(`❌ Failed to send birthday message to ${customer.name}: ${responseText}`)
      return { 
        message: `Failed to send birthday message to ${customer.name}: ${responseText}`, 
        type: 'birthday',
        success: false
      }
    }
  } catch (error: any) {
    console.error('🚨 Error sending birthday message:', error)
    return { 
      message: `Error sending birthday message to ${customer.name}: ${error.message}`, 
      type: 'birthday',
      success: false,
      error: error.message
    }
  }
}

async function executeInactiveCustomerAutomation(automation: any, customer: any) {
  // Send WhatsApp message for inactive customer
  try {
    const whatsappResponse = await fetch('http://localhost:3000/api/whatsapp/send-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: customer.phone,
        templateName: automation.meta_template_name,
        parameters: [
          customer.name,                    // {{1}} - nombre cliente (header)
          "🎁 Oferta especial para ti"     // {{1}} - promocion especial (body)
        ]
      })
    })

    if (whatsappResponse.ok) {
      console.log(`✅ Inactive customer message sent to ${customer.name} (${customer.phone})`)
      return { 
        message: `Inactive customer message sent to ${customer.name}`, 
        type: 'inactive_customers',
        success: true,
        phone: customer.phone
      }
    } else {
      console.log(`❌ Failed to send inactive customer message to ${customer.name}`)
      return { 
        message: `Failed to send inactive customer message to ${customer.name}`, 
        type: 'inactive_customers',
        success: false
      }
    }
  } catch (error: any) {
    console.error('Error sending inactive customer message:', error)
    return { 
      message: `Error sending inactive customer message to ${customer.name}`, 
      type: 'inactive_customers',
      success: false,
      error: error.message
    }
  }
}

async function executeMissingFieldsAutomation(automation: any, customer: any) {
  // Check for missing customer fields
  const missingFields = []
  if (!customer.email) missingFields.push('email')
  if (!customer.birth_date) missingFields.push('birth_date')
  if (!customer.address) missingFields.push('address')
  
  if (missingFields.length === 0) {
    return { 
      message: `No missing fields for ${customer.name}`, 
      type: 'missing_field',
      success: true,
      missingFields: []
    }
  }

  // Send WhatsApp message for missing fields
  try {
    const whatsappResponse = await fetch('http://localhost:3000/api/whatsapp/send-template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: customer.phone,
        templateName: automation.meta_template_name,
        parameters: [
          customer.name,                    // {{1}} - nombre del cliente
          missingFields.join(', '),        // {{2}} - campo faltante
          "25"                              // {{3}} - punto de recompensa por completar
        ]
      })
    })

    if (whatsappResponse.ok) {
      console.log(`✅ Missing fields message sent to ${customer.name} (${customer.phone})`)
      return { 
        message: `Missing fields message sent to ${customer.name}`, 
        type: 'missing_field',
        success: true,
        missingFields,
        phone: customer.phone
      }
    } else {
      console.log(`❌ Failed to send missing fields message to ${customer.name}`)
      return { 
        message: `Failed to send missing fields message to ${customer.name}`, 
        type: 'missing_field',
        success: false,
        missingFields
      }
    }
  } catch (error: any) {
    console.error('Error sending missing fields message:', error)
    return { 
      message: `Error sending missing fields message to ${customer.name}`, 
      type: 'missing_field',
      success: false,
      error: error.message,
      missingFields
    }
  }
}

async function executePointsLoadingAutomation(automation: any, customer: any) {
  // Send points notification via WhatsApp
  try {
    const whatsappResponse = await fetch(process.env.NEXT_PUBLIC_BASE_URL + '/api/whatsapp/send-points-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerPhone: customer.phone,
        customerName: customer.name,
        pointsAdded: 50, // Test with 50 points
        totalPoints: (customer.points || 0) + 50,
        businessId: customer.business_id,
        automationId: automation.id,
        templateName: automation.meta_template_name
      })
    })

    if (whatsappResponse.ok) {
      console.log(`✅ Points notification sent to ${customer.name} (${customer.phone})`)
      return { 
        message: `Points notification sent to ${customer.name}`, 
        type: 'points_notification',
        success: true,
        phone: customer.phone,
        pointsAdded: 50
      }
    } else {
      const errorData = await whatsappResponse.text()
      console.log(`❌ Failed to send points notification to ${customer.name}: ${errorData}`)
      return { 
        message: `Failed to send points notification to ${customer.name}`, 
        type: 'points_notification',
        success: false,
        error: errorData
      }
    }
  } catch (error: any) {
    console.error('Error sending points notification:', error)
    return { 
      message: `Error sending points notification to ${customer.name}`, 
      type: 'points_notification',
      success: false,
      error: error.message
    }
  }
}