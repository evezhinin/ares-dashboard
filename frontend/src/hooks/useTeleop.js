import { useCallback, useEffect, useRef } from 'react'

const SPEED = 0.3  // m/s linear
const TURN  = 0.5  // rad/s angular

export const KEY_MAP = {
  w: { linear:  SPEED, angular:  0    },
  s: { linear: -SPEED, angular:  0    },
  a: { linear:  0,     angular:  TURN },
  d: { linear:  0,     angular: -TURN },
}

export function useTeleop(send, enabled) {
  const interval = useRef(null)

  const startCommand = useCallback(
    (linear, angular) => {
      if (!enabled) return
      if (interval.current) return
      interval.current = setInterval(() => {
        send({ type: 'cmd_vel', linear, angular })
      }, 100) // 10 Hz
    },
    [enabled, send],
  )

  const stopCommand = useCallback(() => {
    clearInterval(interval.current)
    interval.current = null
    send({ type: 'cmd_vel', linear: 0, angular: 0 })
  }, [send])

  useEffect(() => {
    if (!enabled) return

    function onDown(e) {
      const cmd = KEY_MAP[e.key.toLowerCase()]
      if (cmd) startCommand(cmd.linear, cmd.angular)
    }
    function onUp(e) {
      if (KEY_MAP[e.key.toLowerCase()]) stopCommand()
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [enabled, startCommand, stopCommand])

  return { startCommand, stopCommand }
}
