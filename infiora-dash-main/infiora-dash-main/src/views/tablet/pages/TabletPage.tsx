'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'

import { useParams, useSearchParams } from 'next/navigation'

import { installNotificationSoundUnlock, playNotificationSound } from '@/utils/soundUtils'

type StaffSession = {
  staffMemberId: string
  name: string
  permissions: string[]
  groupIds: string[]
  visibleModules?: string[]
  token: string
}

type TabletOrderItem = {
  name: string
  qty: number
}

type TabletOrder = {
  id?: string
  _id?: string
  orderId: string
  roomNumber: string
  items: TabletOrderItem[]
  total: number
  payment: string
  note?: string
  scheduledFor?: string
  status: string
  createdAt: string
}

type TabletSetupConfig = {
  version: 1
  hotelId: string
  groupId: string
  groupName?: string
  deviceToken: string
  createdAt?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''
const PIN_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'clear']
const ACTIVE_STATUSES = ['Awaiting confirmation', 'Processing', 'On the way'] as const
const PAST_STATUSES = ['Completed', 'Cancelled'] as const
const ETA_PRESETS = [15, 20, 30, 45]

const decodeHotelIdFromToken = (deviceToken: string | null): string | null => {
  if (!deviceToken) return null

  try {
    const payload = JSON.parse(atob(deviceToken.split('.')[1] || ''))

    return payload.hotelId || null
  } catch {
    return null
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2
  }).format(value)

const mergeOrders = (current: TabletOrder[], nextOrders: TabletOrder[]) => {
  const byOrderId = new Map<string, TabletOrder>()

  current.forEach(order => byOrderId.set(order.orderId, order))
  nextOrders.forEach(order => byOrderId.set(order.orderId, order))

  return Array.from(byOrderId.values()).sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime()
    const bTime = new Date(b.createdAt || 0).getTime()

    return bTime - aTime
  })
}

export default function TabletPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const groupId = params['groupId'] as string
  const [deviceToken, setDeviceToken] = useState<string | null>(null)
  const [setupMessage, setSetupMessage] = useState('')
  const [session, setSession] = useState<StaffSession | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [orders, setOrders] = useState<TabletOrder[]>([])
  const [pastOrders, setPastOrders] = useState<TabletOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [actionOrderId, setActionOrderId] = useState<string | null>(null)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [alertFlashOn, setAlertFlashOn] = useState(false)
  const [acceptDialogOrder, setAcceptDialogOrder] = useState<TabletOrder | null>(null)
  const [etaPreset, setEtaPreset] = useState<number | null>(20)
  const [customEta, setCustomEta] = useState('')
  const [acceptMessage, setAcceptMessage] = useState('')
  const sseRef = useRef<EventSource | null>(null)
  const previousPendingCountRef = useRef<number | null>(null)
  const inactivityTimerRef = useRef<number | null>(null)
  const setupFileInputRef = useRef<HTMLInputElement | null>(null)

  const applyTabletSetup = useCallback(
    (config: TabletSetupConfig) => {
      if (!config?.deviceToken) {
        throw new Error('Setup file is missing the device token.')
      }

      if (config.groupId !== groupId) {
        throw new Error('This setup file is for a different notification group.')
      }

      window.localStorage.setItem('deviceToken', config.deviceToken)
      setDeviceToken(config.deviceToken)
      setPinError('')
      setSetupMessage(`Tablet authorized for ${config.groupName || 'this group'}.`)
    },
    [groupId]
  )

  useEffect(() => {
    setDeviceToken(window.localStorage.getItem('deviceToken'))
    installNotificationSoundUnlock()
  }, [])

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    const groupNameParam = searchParams.get('group')
    const setupParam = searchParams.get('setup')

    if (tokenParam) {
      try {
        applyTabletSetup({
          version: 1,
          hotelId: '',
          groupId,
          groupName: groupNameParam || undefined,
          deviceToken: tokenParam
        })
        window.history.replaceState({}, '', window.location.pathname)
      } catch {
        setPinError('Tablet install link is invalid.')
      }

      return
    }

    if (!setupParam) return

    try {
      applyTabletSetup(JSON.parse(setupParam) as TabletSetupConfig)
      window.history.replaceState({}, '', window.location.pathname)
    } catch {
      setPinError('Tablet install link is invalid.')
    }
  }, [applyTabletSetup, searchParams])

  const hotelId = useMemo(() => decodeHotelIdFromToken(deviceToken), [deviceToken])

  useEffect(() => {
    return () => {
      sseRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (session || pendingOrdersCount <= 0) {
      setAlertFlashOn(false)

      return
    }

    setAlertFlashOn(true)

    const timer = window.setInterval(() => {
      setAlertFlashOn(current => !current)
    }, 650)

    return () => {
      window.clearInterval(timer)
    }
  }, [pendingOrdersCount, session])

  useEffect(() => {
    if (session) {
      previousPendingCountRef.current = null

      return
    }

    if (previousPendingCountRef.current !== null && pendingOrdersCount > previousPendingCountRef.current) {
      playNotificationSound()
    }

    previousPendingCountRef.current = pendingOrdersCount
  }, [pendingOrdersCount, session])

  useEffect(() => {
    if (session || pendingOrdersCount <= 0) return

    const timer = window.setInterval(() => {
      playNotificationSound()
    }, 4000)

    return () => {
      window.clearInterval(timer)
    }
  }, [pendingOrdersCount, session])

  const closeSSE = () => {
    sseRef.current?.close()
    sseRef.current = null
  }

  const getTodayRange = () => {
    const now = new Date()
    const start = new Date(now)

    start.setHours(0, 0, 0, 0)

    const end = new Date(now)

    end.setHours(23, 59, 59, 999)

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    }
  }

  const normalizeOrders = (payload: unknown): TabletOrder[] => {
    const results = Array.isArray(payload) ? payload : (payload as { results?: unknown[] } | null)?.results || []

    return results.map((order: any) => ({
      id: order.id || order._id,
      _id: order._id || order.id,
      orderId: order.orderId,
      roomNumber: order.guestRoomNumber || order.roomNumber,
      items: order.items || [],
      total: order.total || 0,
      payment: order.payment || '',
      note: order.note || '',
      scheduledFor: order.scheduledFor || undefined,
      status: order.status || '',
      createdAt: order.createdAt
    }))
  }

  const loadActiveOrders = useCallback(
    async (token: string) => {
      if (!hotelId) return []

      const orderResponses = await Promise.all(
        ACTIVE_STATUSES.map(status =>
          fetch(
            `${API_URL}/v1/orders/tablet/hotels/${hotelId}?status=${encodeURIComponent(status)}&groupId=${encodeURIComponent(groupId)}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              },
              cache: 'no-store'
            }
          )
        )
      )

      const failedResponse = orderResponses.find(response => !response.ok)

      if (failedResponse) {
        const errorText = await failedResponse.text()

        throw new Error(errorText || 'Failed to load orders')
      }

      const ordersPayload = await Promise.all(orderResponses.map(response => response.json()))

      return mergeOrders(
        [],
        ordersPayload.flatMap(payloadItem => normalizeOrders(payloadItem))
      )
    },
    [groupId, hotelId]
  )

  const loadPastOrders = useCallback(
    async (token: string) => {
      if (!hotelId) return []

      const { startDate, endDate } = getTodayRange()

      const responses = await Promise.all(
        PAST_STATUSES.map(status =>
          fetch(
            `${API_URL}/v1/orders/tablet/hotels/${hotelId}?status=${encodeURIComponent(status)}&groupId=${encodeURIComponent(groupId)}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
            {
              headers: {
                Authorization: `Bearer ${token}`
              },
              cache: 'no-store'
            }
          )
        )
      )

      const failedResponse = responses.find(response => !response.ok)

      if (failedResponse) {
        const errorText = await failedResponse.text()

        throw new Error(errorText || 'Failed to load past orders')
      }

      const payloads = await Promise.all(responses.map(response => response.json()))

      return mergeOrders(
        [],
        payloads.flatMap(payloadItem => normalizeOrders(payloadItem))
      )
    },
    [groupId, hotelId]
  )

  const loadPendingOrdersCount = useCallback(async () => {
    if (!deviceToken) return 0

    const response = await fetch(`${API_URL}/v1/orders/groups/${groupId}/pending-count`, {
      headers: {
        Authorization: `Bearer ${deviceToken}`
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorText = await response.text()

      throw new Error(errorText || 'Failed to load pending count')
    }

    const payload = (await response.json()) as { count?: number }

    return payload.count || 0
  }, [deviceToken, groupId])

  useEffect(() => {
    if (!deviceToken || !groupId) return

    closeSSE()

    const url = `${API_URL}/v1/orders/groups/${groupId}/events?token=${encodeURIComponent(deviceToken)}`
    const es = new EventSource(url)

    es.addEventListener('rs:new-order', event => {
      const order = JSON.parse((event as MessageEvent).data)

      const normalizedOrder: TabletOrder = {
        id: order.id || order._id,
        _id: order._id || order.id,
        orderId: order.orderId,
        roomNumber: order.guestRoomNumber || order.roomNumber,
        items: order.items || [],
        total: order.total || 0,
        payment: order.payment || '',
        note: order.note || '',
        scheduledFor: order.scheduledFor || undefined,
        status: order.status || 'Awaiting confirmation',
        createdAt: order.createdAt || new Date().toISOString()
      }

      setPendingOrdersCount(prev => Math.max(prev + 1, 1))
      playNotificationSound()

      setOrders(prev => mergeOrders(prev, [normalizedOrder]))
      setPastOrders(prev => prev.filter(pastOrder => pastOrder.orderId !== normalizedOrder.orderId))
    })

    es.addEventListener('rs:order-updated', event => {
      const update = JSON.parse((event as MessageEvent).data)

      setOrders(prev => {
        const target = prev.find(order => order.orderId === update.orderId)

        if (!target) {
          return prev
        }

        if (update.status === 'Completed' || update.status === 'Cancelled') {
          setPastOrders(current =>
            mergeOrders(current, [
              {
                ...target,
                status: update.status,
                note: update.staffNote || target.note
              }
            ])
          )

          return prev.filter(order => order.orderId !== update.orderId)
        }

        return prev.map(order =>
          order.orderId === update.orderId
            ? {
                ...order,
                status: update.status,
                note: update.staffNote || order.note
              }
            : order
        )
      })
    })

    es.onerror = () => {
      setPinError(prev => prev || 'Live connection interrupted. Retrying...')
    }

    sseRef.current = es

    return () => {
      if (sseRef.current === es) {
        closeSSE()
      }
    }
  }, [deviceToken, groupId])

  useEffect(() => {
    if (pin.length === 4) {
      void (async () => {
        if (!hotelId) {
          setPinError('Device token missing or invalid.')
          setPin('')

          return
        }

        setLoading(true)

        try {
          const response = await fetch(`${API_URL}/v1/hotels/${hotelId}/staff/verify-pin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pin })
          })

          if (!response.ok) {
            throw new Error('Invalid PIN')
          }

          const payload = (await response.json()) as StaffSession

          setSession(payload)
          setPin('')
          setPinError('')
          setPendingOrdersCount(0)
          setOrders(await loadActiveOrders(payload.token))
          setPastOrders(await loadPastOrders(payload.token))
        } catch {
          setPinError('Invalid PIN. Try again.')
          setPin('')
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [deviceToken, groupId, hotelId, loadActiveOrders, loadPastOrders, pin])

  useEffect(() => {
    if (!session?.token) return

    let cancelled = false

    const refreshOrders = async () => {
      try {
        const [nextActiveOrders, nextPastOrders] = await Promise.all([
          loadActiveOrders(session.token),
          loadPastOrders(session.token)
        ])

        if (cancelled) return

        setOrders(nextActiveOrders)
        setPastOrders(nextPastOrders)
      } catch {}
    }

    void refreshOrders()

    const timer = window.setInterval(() => {
      void refreshOrders()
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [loadActiveOrders, loadPastOrders, session?.token])

  useEffect(() => {
    if (!deviceToken || session) return

    let cancelled = false

    const refreshPendingCount = async () => {
      try {
        const nextCount = await loadPendingOrdersCount()

        if (cancelled) return

        setPendingOrdersCount(nextCount)
      } catch {}
    }

    void refreshPendingCount()

    const timer = window.setInterval(() => {
      void refreshPendingCount()
    }, 4000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [deviceToken, loadPendingOrdersCount, session])

  const signOut = useCallback(() => {
    if (inactivityTimerRef.current) {
      window.clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }

    setSession(null)
    setOrders([])
    setPastOrders([])
    setPin('')
    setPinError('')
    setActionOrderId(null)
  }, [])

  useEffect(() => {
    if (!session) return

    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current)
      }

      inactivityTimerRef.current = window.setTimeout(() => {
        signOut()
      }, 20000)
    }

    resetInactivityTimer()

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'touchstart', 'keydown', 'scroll']

    events.forEach(eventName => {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true })
    })

    return () => {
      events.forEach(eventName => {
        window.removeEventListener(eventName, resetInactivityTimer)
      })

      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }
  }, [session, signOut])

  const handlePinDigit = (digit: string) => {
    if (loading || pin.length >= 4) return

    setPin(prev => prev + digit)
  }

  const handlePinClear = () => {
    if (loading) return

    setPin('')
  }

  const handleImportSetupClick = () => {
    setupFileInputRef.current?.click()
  }

  const handleSetupFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    try {
      applyTabletSetup(JSON.parse(await file.text()) as TabletSetupConfig)
    } catch (error) {
      setPinError(error instanceof Error ? error.message : 'Failed to import setup file.')
    } finally {
      event.target.value = ''
    }
  }

  const openAcceptDialog = (order: TabletOrder) => {
    setAcceptDialogOrder(order)
    setEtaPreset(20)
    setCustomEta('')
    setAcceptMessage('')
  }

  const closeAcceptDialog = () => {
    setAcceptDialogOrder(null)
    setEtaPreset(20)
    setCustomEta('')
    setAcceptMessage('')
  }

  const postOrderAction = async (
    orderId: string,
    action: 'accept' | 'cancel' | 'advance',
    options?: { acceptedEta?: number; message?: string }
  ) => {
    if (!session) return

    setActionOrderId(orderId)

    try {
      const body =
        action === 'accept'
          ? {
              acceptedEta: options?.acceptedEta ?? 15,
              message: options?.message || undefined
            }
          : {}

      const response = await fetch(`${API_URL}/v1/orders/tablet/${orderId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorText = await response.text()

        throw new Error(errorText || `Failed to ${action} order`)
      }

      setOrders(prev =>
        prev
          .map(order => {
            if ((order._id || order.id) !== orderId) {
              return order
            }

            if (action === 'cancel') {
              setPastOrders(current => mergeOrders(current, [{ ...order, status: 'Cancelled' }]))

              return { ...order, status: 'Cancelled' }
            }

            if (action === 'accept') {
              return { ...order, status: 'Processing' }
            }

            if (action === 'advance') {
              const nextStatus = order.status === 'Processing' ? 'On the way' : 'Completed'

              if (nextStatus === 'Completed') {
                setPastOrders(current => mergeOrders(current, [{ ...order, status: 'Completed' }]))
              }

              return {
                ...order,
                status: nextStatus
              }
            }

            return order
          })
          .filter(order => order.status !== 'Completed' && order.status !== 'Cancelled')
      )

      if (action === 'accept') {
        closeAcceptDialog()
      }
    } catch (error) {
      setPinError(error instanceof Error ? error.message : `Failed to ${action} order`)
    } finally {
      setActionOrderId(null)
    }
  }

  const acceptEtaValue = etaPreset !== null ? etaPreset : parseInt(customEta, 10) || undefined

  const ordersByStatus = useMemo(() => {
    return ACTIVE_STATUSES.map(status => ({
      status,
      orders: orders.filter(order => order.status === status)
    }))
  }, [orders])

  const pastOrdersByStatus = useMemo(() => {
    return PAST_STATUSES.map(status => ({
      status,
      orders: pastOrders.filter(order => order.status === status)
    }))
  }, [pastOrders])

  const getStatusColor = (status: string) => {
    if (status === 'Awaiting confirmation') return styles.awaitingPill
    if (status === 'Processing') return styles.processingPill

    return styles.onTheWayPill
  }

  if (!deviceToken || !hotelId) {
    return (
      <div style={styles.center}>
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Tablet Setup Required</h2>
          <p style={styles.panelText}>
            Open the install link from Orders Setup on this device, or import the tablet setup file here.
          </p>
          {setupMessage && <p style={styles.success}>{setupMessage}</p>}
          {pinError && <p style={styles.error}>{pinError}</p>}
          <div style={styles.setupActions}>
            <button type='button' onClick={handleImportSetupClick} style={styles.setupButton}>
              Import Setup File
            </button>
            <button
              type='button'
              onClick={() => window.location.reload()}
              style={{ ...styles.setupButton, ...styles.setupButtonSecondary }}
            >
              Reload Page
            </button>
          </div>
          <input
            ref={setupFileInputRef}
            type='file'
            accept='application/json,.json'
            onChange={event => void handleSetupFileSelected(event)}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={styles.center}>
        <div
          style={{
            ...styles.panel,
            ...(pendingOrdersCount > 0 ? (alertFlashOn ? styles.alertPanelStrong : styles.alertPanelSoft) : null)
          }}
        >
          <div style={styles.kicker}>Notification Group {groupId}</div>
          <h1 style={styles.title}>Enter PIN</h1>
          {setupMessage && <p style={styles.success}>{setupMessage}</p>}
          {pendingOrdersCount > 0 && (
            <div style={{ ...styles.pendingBanner, ...styles.pendingBannerPulse }}>
              {pendingOrdersCount} new {pendingOrdersCount === 1 ? 'order is' : 'orders are'} waiting for this group.
            </div>
          )}
          <button type='button' onClick={playNotificationSound} style={styles.testSoundButton}>
            Test Sound
          </button>
          <div style={styles.pinDots}>
            {'*'.repeat(pin.length)}
            {'o'.repeat(4 - pin.length)}
          </div>
          {pinError && <p style={styles.error}>{pinError}</p>}
          <div style={styles.pinGrid}>
            {PIN_KEYS.map(key => (
              <button
                key={key || 'empty'}
                type='button'
                onClick={() => {
                  if (key === 'clear') {
                    handlePinClear()

                    return
                  }

                  if (key) {
                    handlePinDigit(key)
                  }
                }}
                disabled={loading || !key}
                style={{
                  ...styles.pinButton,
                  ...(key ? null : styles.pinButtonGhost)
                }}
              >
                {key === 'clear' ? 'CLR' : key}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.shell}>
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>Tablet Queue</div>
          <h1 style={styles.headerTitle}>Orders for {session.name}</h1>
        </div>
        <button type='button' onClick={signOut} style={styles.signOutButton}>
          Sign Out
        </button>
      </div>

      <button type='button' onClick={playNotificationSound} style={styles.testSoundButton}>
        Test Sound
      </button>

      {pinError && <p style={{ ...styles.error, marginBottom: 16 }}>{pinError}</p>}

      {orders.length === 0 ? (
        <div style={styles.emptyState}>
          <h2 style={styles.panelTitle}>No active orders</h2>
          <p style={styles.panelText}>
            New orders for this group will appear here automatically, and accepted orders will stay visible until they
            are completed.
          </p>
        </div>
      ) : (
        <div style={styles.sections}>
          {ordersByStatus.map(section => (
            <section key={section.status} style={styles.statusSection}>
              <div style={styles.statusHeader}>
                <h2 style={styles.statusTitle}>{section.status}</h2>
                <span style={styles.statusCount}>{section.orders.length}</span>
              </div>

              {section.orders.length === 0 ? (
                <div style={styles.sectionEmpty}>No orders in this stage.</div>
              ) : (
                <div style={styles.grid}>
                  {section.orders.map(order => {
                    const orderInternalId = order._id || order.id || order.orderId

                    return (
                      <article key={order.orderId} style={styles.card}>
                        <div style={styles.cardTop}>
                          <strong style={styles.orderId}>{order.orderId}</strong>
                          <span style={styles.roomPill}>Room {order.roomNumber || 'N/A'}</span>
                        </div>

                        <div style={styles.metaRow}>
                          <span>{formatCurrency(order.total || 0)}</span>
                          <span style={{ ...styles.statusPill, ...getStatusColor(order.status) }}>{order.status}</span>
                        </div>

                        <ul style={styles.itemList}>
                          {order.items.map((item, index) => (
                            <li key={`${order.orderId}-${index}`} style={styles.itemRow}>
                              <span>{item.name}</span>
                              <strong>x{item.qty}</strong>
                            </li>
                          ))}
                        </ul>

                        {order.note && <p style={styles.note}>{order.note}</p>}
                        {order.scheduledFor && (
                          <p style={styles.scheduled}>Scheduled for {new Date(order.scheduledFor).toLocaleString()}</p>
                        )}

                        <div style={styles.actions}>
                          {order.status === 'Awaiting confirmation' &&
                            session.permissions.includes('orders:accept') && (
                              <button
                                type='button'
                                onClick={() => openAcceptDialog(order)}
                                disabled={actionOrderId === orderInternalId}
                                style={{ ...styles.actionButton, ...styles.acceptButton }}
                              >
                                Accept
                              </button>
                            )}
                          {(order.status === 'Processing' || order.status === 'On the way') &&
                            session.permissions.includes('orders:complete') && (
                              <button
                                type='button'
                                onClick={() => void postOrderAction(orderInternalId, 'advance')}
                                disabled={actionOrderId === orderInternalId}
                                style={{ ...styles.actionButton, ...styles.advanceButton }}
                              >
                                {order.status === 'Processing' ? 'Mark On The Way' : 'Complete'}
                              </button>
                            )}
                          {session.permissions.includes('orders:cancel') && order.status !== 'On the way' && (
                            <button
                              type='button'
                              onClick={() => void postOrderAction(orderInternalId, 'cancel')}
                              disabled={actionOrderId === orderInternalId}
                              style={{ ...styles.actionButton, ...styles.cancelButton }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <section style={styles.historySection}>
        <div style={styles.statusHeader}>
          <h2 style={styles.statusTitle}>Past Orders Today</h2>
          <span style={styles.statusCount}>{pastOrders.length}</span>
        </div>

        {pastOrders.length === 0 ? (
          <div style={styles.sectionEmpty}>Completed and cancelled orders from today will appear here.</div>
        ) : (
          <div style={styles.sections}>
            {pastOrdersByStatus.map(section => (
              <section key={section.status} style={styles.statusSection}>
                <div style={styles.subsectionHeader}>
                  <h3 style={styles.subsectionTitle}>{section.status}</h3>
                  <span style={styles.subsectionCount}>{section.orders.length}</span>
                </div>

                {section.orders.length === 0 ? (
                  <div style={styles.sectionEmpty}>No {section.status.toLowerCase()} orders today.</div>
                ) : (
                  <div style={styles.grid}>
                    {section.orders.map(order => (
                      <article key={`${order.orderId}-${order.status}`} style={{ ...styles.card, ...styles.pastCard }}>
                        <div style={styles.cardTop}>
                          <strong style={styles.orderId}>{order.orderId}</strong>
                          <span style={styles.roomPill}>Room {order.roomNumber || 'N/A'}</span>
                        </div>

                        <div style={styles.metaRow}>
                          <span>{formatCurrency(order.total || 0)}</span>
                          <span
                            style={{
                              ...styles.statusPill,
                              ...(order.status === 'Completed' ? styles.completedPill : styles.cancelledPill)
                            }}
                          >
                            {order.status}
                          </span>
                        </div>

                        <ul style={styles.itemList}>
                          {order.items.map((item, index) => (
                            <li key={`${order.orderId}-${order.status}-${index}`} style={styles.itemRow}>
                              <span>{item.name}</span>
                              <strong>x{item.qty}</strong>
                            </li>
                          ))}
                        </ul>

                        {order.note && <p style={styles.note}>{order.note}</p>}
                        <p style={styles.historyMeta}>
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </section>

      {acceptDialogOrder && (
        <div style={styles.dialogOverlay}>
          <div style={styles.dialogCard}>
            <div style={styles.dialogHeader}>
              <div>
                <div style={styles.dialogTitle}>Accept Order</div>
                <div style={styles.dialogSubtitle}>#{acceptDialogOrder.orderId}</div>
              </div>
            </div>

            <div style={styles.dialogSection}>
              <div style={styles.dialogLabel}>Order Contents</div>
              <div style={styles.dialogSummary}>
                <div style={styles.dialogMeta}>
                  Infiora room {acceptDialogOrder.roomNumber || 'N/A'} · Guest room{' '}
                  {acceptDialogOrder.roomNumber || 'N/A'}
                </div>
                <ul style={styles.dialogItemList}>
                  {acceptDialogOrder.items.map((item, index) => (
                    <li key={`${acceptDialogOrder.orderId}-accept-${index}`} style={styles.dialogItemRow}>
                      <span>
                        {item.qty}x {item.name}
                      </span>
                    </li>
                  ))}
                </ul>
                <div style={styles.dialogTotal}>Total: {formatCurrency(acceptDialogOrder.total || 0)}</div>
              </div>
            </div>

            <div style={styles.dialogSection}>
              <div style={styles.dialogLabel}>Estimated Delivery Time</div>
              <div style={styles.etaGrid}>
                {ETA_PRESETS.map(value => (
                  <button
                    key={value}
                    type='button'
                    onClick={() => {
                      setEtaPreset(value)
                      setCustomEta('')
                    }}
                    style={{
                      ...styles.etaButton,
                      ...(etaPreset === value ? styles.etaButtonActive : null)
                    }}
                  >
                    {value} min
                  </button>
                ))}
              </div>
              <div style={styles.customEtaRow}>
                <span style={styles.customEtaLabel}>Custom:</span>
                <input
                  type='number'
                  min={1}
                  value={customEta}
                  onChange={event => {
                    setCustomEta(event.target.value)
                    setEtaPreset(null)
                  }}
                  placeholder='--'
                  style={styles.customEtaInput}
                />
                <span style={styles.customEtaLabel}>minutes</span>
              </div>
            </div>

            <div style={styles.dialogSection}>
              <div style={styles.dialogLabel}>Message To Guest (Optional)</div>
              <textarea
                value={acceptMessage}
                onChange={event => setAcceptMessage(event.target.value)}
                placeholder='e.g. Your order is being prepared, expect delivery in ~25 minutes...'
                rows={3}
                style={styles.messageInput}
              />
            </div>

            <div style={styles.dialogActions}>
              <button type='button' onClick={closeAcceptDialog} style={styles.dialogCancelButton}>
                Cancel
              </button>
              <button
                type='button'
                onClick={() =>
                  void postOrderAction(
                    acceptDialogOrder._id || acceptDialogOrder.id || acceptDialogOrder.orderId,
                    'accept',
                    {
                      acceptedEta: acceptEtaValue,
                      message: acceptMessage.trim() || undefined
                    }
                  )
                }
                disabled={
                  actionOrderId === (acceptDialogOrder._id || acceptDialogOrder.id || acceptDialogOrder.orderId)
                }
                style={styles.dialogConfirmButton}
              >
                Accept and notify guest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  shell: {
    minHeight: '100vh',
    padding: 24,
    color: '#f8fafc'
  },
  panel: {
    width: 'min(100%, 520px)',
    background: 'rgba(15, 23, 42, 0.78)',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    borderRadius: 28,
    padding: 28,
    boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
    backdropFilter: 'blur(18px)'
  },
  alertPanel: {
    border: '2px solid rgba(34, 197, 94, 0.78)',
    boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.12), 0 0 38px rgba(34, 197, 94, 0.45), 0 30px 80px rgba(0,0,0,0.45)'
  },
  alertPanelSoft: {
    border: '2px solid rgba(34, 197, 94, 0.5)',
    boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.08), 0 0 18px rgba(34, 197, 94, 0.24), 0 30px 80px rgba(0,0,0,0.45)'
  },
  alertPanelStrong: {
    border: '2px solid rgba(34, 197, 94, 0.92)',
    boxShadow: '0 0 0 5px rgba(34, 197, 94, 0.18), 0 0 52px rgba(34, 197, 94, 0.65), 0 30px 80px rgba(0,0,0,0.45)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    flexWrap: 'wrap'
  },
  testSoundButton: {
    marginBottom: 18,
    background: 'rgba(59, 130, 246, 0.16)',
    color: '#bfdbfe',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: 999,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  kicker: {
    color: '#86efac',
    fontSize: 13,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    lineHeight: 1,
    marginBottom: 18
  },
  headerTitle: {
    fontSize: 'clamp(1.8rem, 4vw, 3rem)',
    lineHeight: 1.05
  },
  panelTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
    marginBottom: 8
  },
  panelText: {
    color: '#cbd5e1',
    lineHeight: 1.5
  },
  pinDots: {
    fontSize: 32,
    letterSpacing: 10,
    marginBottom: 18,
    minHeight: 44
  },
  pendingBanner: {
    marginBottom: 16,
    borderRadius: 16,
    padding: '12px 14px',
    background: 'rgba(250, 204, 21, 0.14)',
    color: '#fde68a',
    border: '1px solid rgba(250, 204, 21, 0.25)'
  },
  pendingBannerPulse: {
    background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.24) 0%, rgba(250, 204, 21, 0.18) 100%)',
    color: '#dcfce7',
    border: '1px solid rgba(34, 197, 94, 0.4)'
  },
  error: {
    color: '#fca5a5',
    marginBottom: 12
  },
  success: {
    color: '#bbf7d0',
    marginBottom: 12
  },
  setupActions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 20
  },
  setupButton: {
    border: 0,
    borderRadius: 999,
    padding: '12px 18px',
    fontWeight: 800,
    cursor: 'pointer',
    background: '#6366f1',
    color: '#fff'
  },
  setupButtonSecondary: {
    background: 'rgba(148, 163, 184, 0.18)',
    color: '#e2e8f0',
    border: '1px solid rgba(148, 163, 184, 0.24)'
  },
  pinGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12
  },
  pinButton: {
    height: 86,
    borderRadius: 20,
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(30, 41, 59, 0.9)',
    color: '#f8fafc',
    fontSize: 28,
    cursor: 'pointer'
  },
  pinButtonGhost: {
    background: 'transparent',
    cursor: 'default'
  },
  signOutButton: {
    background: '#ef4444',
    color: '#fff',
    border: 0,
    borderRadius: 999,
    padding: '12px 18px',
    cursor: 'pointer',
    fontWeight: 700
  },
  emptyState: {
    borderRadius: 24,
    border: '1px dashed rgba(148, 163, 184, 0.3)',
    background: 'rgba(15, 23, 42, 0.55)',
    padding: 32,
    textAlign: 'center'
  },
  sections: {
    display: 'grid',
    gap: 24
  },
  historySection: {
    display: 'grid',
    gap: 18,
    marginTop: 32
  },
  statusSection: {
    display: 'grid',
    gap: 14
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  statusTitle: {
    fontSize: 'clamp(1.3rem, 3vw, 1.8rem)',
    margin: 0
  },
  subsectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  subsectionTitle: {
    fontSize: '1.05rem',
    margin: 0,
    color: '#cbd5e1'
  },
  subsectionCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(148, 163, 184, 0.12)',
    color: '#cbd5e1',
    fontWeight: 700,
    fontSize: 13
  },
  statusCount: {
    minWidth: 36,
    height: 36,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(148, 163, 184, 0.16)',
    color: '#e2e8f0',
    fontWeight: 700
  },
  sectionEmpty: {
    borderRadius: 18,
    border: '1px dashed rgba(148, 163, 184, 0.25)',
    padding: 18,
    color: '#94a3b8'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 18
  },
  card: {
    background: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(17,24,39,0.96) 100%)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0 20px 50px rgba(0,0,0,0.28)'
  },
  pastCard: {
    opacity: 0.92
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  orderId: {
    fontSize: 20
  },
  roomPill: {
    borderRadius: 999,
    background: 'rgba(59, 130, 246, 0.18)',
    color: '#bfdbfe',
    padding: '6px 10px',
    fontSize: 13
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    color: '#e2e8f0',
    marginBottom: 12
  },
  metaMuted: {
    color: '#94a3b8',
    textTransform: 'capitalize'
  },
  statusPill: {
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700
  },
  awaitingPill: {
    background: 'rgba(250, 204, 21, 0.18)',
    color: '#fde68a'
  },
  processingPill: {
    background: 'rgba(59, 130, 246, 0.18)',
    color: '#bfdbfe'
  },
  onTheWayPill: {
    background: 'rgba(34, 197, 94, 0.18)',
    color: '#bbf7d0'
  },
  completedPill: {
    background: 'rgba(34, 197, 94, 0.18)',
    color: '#bbf7d0'
  },
  cancelledPill: {
    background: 'rgba(239, 68, 68, 0.16)',
    color: '#fecaca'
  },
  itemList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 14px 0',
    display: 'grid',
    gap: 10
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    color: '#e5e7eb'
  },
  note: {
    color: '#cbd5e1',
    background: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12
  },
  scheduled: {
    color: '#fde68a',
    marginBottom: 12
  },
  historyMeta: {
    color: '#94a3b8',
    marginTop: 8
  },
  actions: {
    display: 'flex',
    gap: 10
  },
  actionButton: {
    flex: 1,
    border: 0,
    borderRadius: 16,
    padding: '14px 16px',
    fontWeight: 800,
    cursor: 'pointer'
  },
  acceptButton: {
    background: '#22c55e',
    color: '#052e16'
  },
  advanceButton: {
    background: '#3b82f6',
    color: '#eff6ff'
  },
  cancelButton: {
    background: '#ef4444',
    color: '#fff'
  },
  dialogOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 6, 23, 0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 50
  },
  dialogCard: {
    width: 'min(100%, 640px)',
    background: '#f8fafc',
    color: '#0f172a',
    borderRadius: 24,
    padding: 24,
    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
    display: 'grid',
    gap: 20
  },
  dialogHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  dialogTitle: {
    fontSize: 32,
    fontWeight: 800
  },
  dialogSubtitle: {
    color: '#64748b',
    fontWeight: 700
  },
  dialogSection: {
    display: 'grid',
    gap: 10
  },
  dialogLabel: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#64748b'
  },
  dialogSummary: {
    background: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    display: 'grid',
    gap: 10
  },
  dialogMeta: {
    color: '#64748b'
  },
  dialogItemList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: 6
  },
  dialogItemRow: {
    display: 'flex'
  },
  dialogTotal: {
    fontWeight: 800
  },
  etaGrid: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap'
  },
  etaButton: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#334155',
    borderRadius: 12,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  etaButtonActive: {
    background: '#e2e8f0',
    borderColor: '#94a3b8'
  },
  customEtaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap'
  },
  customEtaLabel: {
    color: '#64748b'
  },
  customEtaInput: {
    width: 88,
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 16
  },
  messageInput: {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    flexWrap: 'wrap'
  },
  dialogCancelButton: {
    border: 0,
    background: 'transparent',
    color: '#6366f1',
    padding: '12px 14px',
    cursor: 'pointer',
    fontWeight: 700
  },
  dialogConfirmButton: {
    border: 0,
    borderRadius: 999,
    background: '#6366f1',
    color: '#fff',
    padding: '12px 20px',
    cursor: 'pointer',
    fontWeight: 800
  }
}
