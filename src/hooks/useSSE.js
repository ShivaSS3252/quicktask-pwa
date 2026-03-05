// src/hooks/useSSE.js
// Server Sent Events — real-time push from server to browser
// Real world: Like Slack pushing new channel notifications to all members
import { useEffect, useRef, useState } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL

export const useSSE = ({ onNewCategory, onUpdatedCategory, onDeletedCategory }) => {
  const eventSourceRef = useRef(null)
  const [sseStatus, setSSEStatus] = useState('disconnected')
  const reconnectTimer = useRef(null)

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [])

  const connect = () => {
    // SSE only works online
    if (!navigator.onLine) {
      setSSEStatus('offline')
      return
    }

    try {
      // Open SSE connection — browser keeps this open automatically
      // Any data sent by server arrives here instantly
      eventSourceRef.current = new EventSource(`${BASE_URL}/api/events`)

      eventSourceRef.current.onopen = () => {
        console.log('SSE connected ✅')
        setSSEStatus('connected')
        // Clear any pending reconnect timer
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current)
        }
      }

      eventSourceRef.current.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          console.log('SSE received:', payload.type)
          handleSSEEvent(payload)
        } catch (err) {
          console.error('SSE parse error:', err)
        }
      }

      eventSourceRef.current.onerror = () => {
        console.log('SSE disconnected — reconnecting in 5s...')
        setSSEStatus('reconnecting')
        disconnect()

        // Auto reconnect after 5 seconds
        // Real world: WhatsApp reconnecting when internet returns
        reconnectTimer.current = setTimeout(() => {
          connect()
        }, 5000)
      }
    } catch (err) {
      console.error('SSE connection failed:', err)
      setSSEStatus('disconnected')
    }
  }

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }

  const handleSSEEvent = (payload) => {
    switch (payload.type) {
      case 'CONNECTED':
        console.log('SSE handshake confirmed')
        break

      case 'NEW_CATEGORY':
        // New category added — update UI instantly
        // Real world: New Slack channel appearing in sidebar
        onNewCategory && onNewCategory(payload.data)
        break

      case 'UPDATED_CATEGORY':
        onUpdatedCategory && onUpdatedCategory(payload.data)
        break

      case 'DELETED_CATEGORY':
        onDeletedCategory && onDeletedCategory(payload.data.id)
        break

      case 'HEARTBEAT':
        // Keep-alive ping — ignore silently
        break

      default:
        console.log('Unknown SSE event:', payload.type)
    }
  }

  return { sseStatus }
}