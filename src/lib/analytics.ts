import posthog from 'posthog-js'

let iniciado = false

export function initAnalytics() {
  if (iniciado || typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    // La pantalla muestra saldo, cuenta Deriv (loginid) y montos reales de
    // trading — autocapture y session recording quedan apagados para que
    // solo viajen los eventos explícitos de track() de abajo.
    autocapture: false,
    disable_session_recording: true,
  })
  posthog.register({ app_name: 'synthtrade' })
  iniciado = true
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!iniciado) return
  posthog.capture(event, properties)
}
