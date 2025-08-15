import { NextRequest, NextResponse } from 'next/server'
import { EvolutionApiService } from '@/services/evolutionApi'

const evolutionApi = new EvolutionApiService()

export async function POST(request: NextRequest) {
  try {
    const { businessId } = await request.json()
    
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    const instanceName = `business-${businessId}-bot`
    const instance = await evolutionApi.createInstance(instanceName)
    
    return NextResponse.json(instance)
  } catch (error: any) {
    console.error('Error creating instance:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}