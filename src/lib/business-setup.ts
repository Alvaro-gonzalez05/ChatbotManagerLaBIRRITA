import { createClient } from './supabase'
import { createSampleCustomer } from './seed-data'

export async function createDefaultBusiness(userId: string) {
  const supabase = createClient()
  
  // Check if business already exists
  const { data: existingBusiness } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .single()
    
  if (existingBusiness) {
    return existingBusiness
  }
  
  // Create default business
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .insert({
      owner_id: userId,
      name: 'Mi Negocio',
      description: 'Descripción de mi negocio',
      phone: '+54 9 XXX XXX-XXXX',
      email: 'contacto@minegocio.com',
      working_hours: {
        monday: { open: '09:00', close: '18:00', closed: false },
        tuesday: { open: '09:00', close: '18:00', closed: false },
        wednesday: { open: '09:00', close: '18:00', closed: false },
        thursday: { open: '09:00', close: '18:00', closed: false },
        friday: { open: '09:00', close: '18:00', closed: false },
        saturday: { open: '10:00', close: '16:00', closed: false },
        sunday: { open: '10:00', close: '16:00', closed: true }
      }
    })
    .select()
    .single()
    
  if (businessError) throw businessError
  
  // Create business_user entry
  const { error: userError } = await supabase
    .from('business_users')
    .insert({
      business_id: business.id,
      user_id: userId,
      role: 'admin',
      permissions: {
        dashboard: true,
        point_loading: true,
        bot_configuration: true,
        client_management: true,
        reservations_dashboard: true,
        loyalty_program: true,
        reports_analytics: true,
        employee_management: true
      },
      first_name: 'Admin',
      last_name: 'Sistema'
    })
    
  if (userError) throw userError
  
  // Create default loyalty settings
  await supabase
    .from('loyalty_settings')
    .insert({
      business_id: business.id,
      purchase_ranges: [
        { min: 0, max: 50000, points: 50 },
        { min: 50001, max: 100000, points: 150 },
        { min: 100001, max: 200000, points: 350 },
        { min: 200001, max: null, points: 500 }
      ],
      welcome_points: 50,
      birthday_bonus_points: 100,
      referral_points: 200,
      points_expiry_days: 365,
      expiry_notification_days: 30
    })
  
  // Create sample customer for testing
  try {
    await createSampleCustomer(business.id)
  } catch (error) {
    console.log('Sample customer may already exist:', error)
  }
  
  return business
}