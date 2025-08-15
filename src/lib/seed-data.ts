import { createClient } from './supabase'

export async function createSampleCustomer(businessId: string) {
  const supabase = createClient()
  
  // Check if customer already exists
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone', '+54 9 123 456-7890')
    .single()
  
  if (existing) {
    return existing
  }
  
  // Create sample customer
  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      business_id: businessId,
      phone: '+54 9 123 456-7890',
      name: 'Juan Pérez',
      email: 'juan.perez@email.com',
      instagram_username: '@juanperez',
      birthday: '1990-05-15',
      points: 150,
      total_spent: 25000,
      visit_count: 5,
      status: 'active',
      notes: 'Cliente frecuente, prefiere mesas cerca de la ventana'
    })
    .select()
    .single()
  
  if (error) throw error
  
  return customer
}