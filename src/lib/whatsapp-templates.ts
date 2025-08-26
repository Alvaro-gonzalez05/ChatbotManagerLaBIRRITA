// Configuración de plantillas de WhatsApp Business API
// Mapea automáticamente las plantillas con sus parámetros esperados

export interface TemplateConfig {
  name: string
  category: 'MARKETING' | 'UTILITY'
  language: string
  hasHeader: boolean
  headerParameters: number
  bodyParameters: number
  hasFooter: boolean
  hasButtons: boolean
  description: string
}

export const WhatsAppTemplates: Record<string, TemplateConfig> = {
  hello_world: {
    name: 'hello_world',
    category: 'UTILITY',
    language: 'en_US',
    hasHeader: false,
    headerParameters: 0,
    bodyParameters: 0,
    hasFooter: false,
    hasButtons: false,
    description: 'Plantilla básica de Meta sin parámetros'
  },

  birthday_reminder: {
    name: 'birthday_reminder',
    category: 'MARKETING',
    language: 'es_AR',
    hasHeader: true,
    headerParameters: 1, // nombre del cliente
    bodyParameters: 2, // promocion especial, puntos de regalo
    hasFooter: true,
    hasButtons: true,
    description: 'Recordatorio de cumpleaños con promoción'
  },

  points_notification: {
    name: 'points_notification',
    category: 'UTILITY',
    language: 'es_AR',
    hasHeader: false,
    headerParameters: 0,
    bodyParameters: 3, // nombre del cliente, puntos sumados, recompensas disponibles
    hasFooter: true,
    hasButtons: true,
    description: 'Notificación de puntos cargados'
  },

  inactive_customer_vip: {
    name: 'inactive_customer_vip',
    category: 'MARKETING',
    language: 'es_AR',
    hasHeader: true,
    headerParameters: 1, // nombre del cliente
    bodyParameters: 1, // promocion especial
    hasFooter: true,
    hasButtons: true,
    description: 'Reactivación para clientes VIP (4+ visitas)'
  },

  inactive_customer_new: {
    name: 'inactive_customer_new',
    category: 'MARKETING',
    language: 'es_AR',
    hasHeader: true,
    headerParameters: 1, // nombre del cliente
    bodyParameters: 1, // promocion especial
    hasFooter: true,
    hasButtons: true,
    description: 'Reactivación para clientes nuevos (1-3 visitas)'
  },

  missing_data_request: {
    name: 'missing_data_request',
    category: 'UTILITY',
    language: 'es_AR',
    hasHeader: false,
    headerParameters: 0,
    bodyParameters: 3, // nombre del cliente, campo faltante, puntos recompensa
    hasFooter: true,
    hasButtons: true,
    description: 'Solicitud para completar datos faltantes'
  }
}

export function getTemplateConfig(templateName: string): TemplateConfig | null {
  return WhatsAppTemplates[templateName] || null
}

export function validateTemplateParameters(templateName: string, parameters: string[]): boolean {
  const config = getTemplateConfig(templateName)
  if (!config) return false
  
  const expectedParams = config.headerParameters + config.bodyParameters
  return parameters.length === expectedParams
}

export function buildTemplateComponents(templateName: string, parameters: string[]) {
  const config = getTemplateConfig(templateName)
  if (!config || !validateTemplateParameters(templateName, parameters)) {
    throw new Error(`Configuración inválida para plantilla ${templateName}`)
  }

  const components = []
  let paramIndex = 0

  // Add header component if needed
  if (config.hasHeader && config.headerParameters > 0) {
    const headerParams = parameters.slice(paramIndex, paramIndex + config.headerParameters)
    components.push({
      type: 'header',
      parameters: headerParams.map(param => ({
        type: 'text',
        text: param
      }))
    })
    paramIndex += config.headerParameters
  }

  // Add body component if needed
  if (config.bodyParameters > 0) {
    const bodyParams = parameters.slice(paramIndex, paramIndex + config.bodyParameters)
    components.push({
      type: 'body',
      parameters: bodyParams.map(param => ({
        type: 'text',
        text: param
      }))
    })
  }

  return components
}
