import { useEffect, useRef, useState, useCallback } from 'react'

const SPEED = 0.3
const TURN = 0.5

/* ── helpers ────────────────────────────────────────── */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function defineBlocks(Blockly) {
  /* ── Movement ─────────────────────────── */

  Blockly.Blocks['move_forward'] = {
    init() {
      this.appendDummyInput()
        .appendField('Move forward')
        .appendField(new Blockly.FieldNumber(1, 0.1, 30, 0.1), 'DURATION')
        .appendField('sec')
      this.appendDummyInput()
        .appendField('speed')
        .appendField(new Blockly.FieldNumber(SPEED, 0.05, 2, 0.05), 'SPEED')
        .appendField('m/s')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
      this.setColour('#1B3A6B')
      this.setTooltip('Drive forward at the given speed for N seconds')
    },
  }

  Blockly.Blocks['move_backward'] = {
    init() {
      this.appendDummyInput()
        .appendField('Move backward')
        .appendField(new Blockly.FieldNumber(1, 0.1, 30, 0.1), 'DURATION')
        .appendField('sec')
      this.appendDummyInput()
        .appendField('speed')
        .appendField(new Blockly.FieldNumber(SPEED, 0.05, 2, 0.05), 'SPEED')
        .appendField('m/s')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
      this.setColour('#1B3A6B')
      this.setTooltip('Drive backward at the given speed for N seconds')
    },
  }

  Blockly.Blocks['turn_left'] = {
    init() {
      this.appendDummyInput()
        .appendField('Turn left')
        .appendField(new Blockly.FieldNumber(1, 0.1, 30, 0.1), 'DURATION')
        .appendField('sec')
      this.appendDummyInput()
        .appendField('speed')
        .appendField(new Blockly.FieldNumber(TURN, 0.05, 3, 0.05), 'SPEED')
        .appendField('rad/s')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
      this.setColour('#24508f')
      this.setTooltip('Rotate left (CCW) for N seconds')
    },
  }

  Blockly.Blocks['turn_right'] = {
    init() {
      this.appendDummyInput()
        .appendField('Turn right')
        .appendField(new Blockly.FieldNumber(1, 0.1, 30, 0.1), 'DURATION')
        .appendField('sec')
      this.appendDummyInput()
        .appendField('speed')
        .appendField(new Blockly.FieldNumber(TURN, 0.05, 3, 0.05), 'SPEED')
        .appendField('rad/s')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
      this.setColour('#24508f')
      this.setTooltip('Rotate right (CW) for N seconds')
    },
  }

  Blockly.Blocks['stop'] = {
    init() {
      this.appendDummyInput().appendField('Stop')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
      this.setColour('#d63c2a')
      this.setTooltip('Send zero velocity (full stop)')
    },
  }

  Blockly.Blocks['set_speed'] = {
    init() {
      this.appendDummyInput()
        .appendField('Set speed')
      this.appendDummyInput()
        .appendField('linear')
        .appendField(new Blockly.FieldNumber(0.2, -2, 2, 0.05), 'LINEAR')
        .appendField('m/s  angular')
        .appendField(new Blockly.FieldNumber(0, -3, 3, 0.05), 'ANGULAR')
        .appendField('rad/s')
      this.appendDummyInput()
        .appendField('for')
        .appendField(new Blockly.FieldNumber(1, 0.1, 30, 0.1), 'DURATION')
        .appendField('sec')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
      this.setColour('#1B3A6B')
      this.setTooltip('Send custom linear + angular velocity for N seconds')
    },
  }

  Blockly.Blocks['wait'] = {
    init() {
      this.appendDummyInput()
        .appendField('Wait')
        .appendField(new Blockly.FieldNumber(1, 0.1, 60, 0.1), 'DURATION')
        .appendField('sec')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
      this.setColour('#4a5568')
      this.setTooltip('Pause execution for N seconds')
    },
  }

  /* ── Missions ─────────────────────────── */

  Blockly.Blocks['mission_patrol'] = {
    init() {
      this.appendDummyInput().appendField('Mission: Patrol')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
      this.setColour('#F5C200')
      this.setTooltip('Execute a rectangular patrol loop')
    },
  }

  Blockly.Blocks['mission_return_home'] = {
    init() {
      this.appendDummyInput().appendField('Mission: Return Home')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
      this.setColour('#2a7d4f')
      this.setTooltip('Navigate back to origin (0, 0, 0)')
    },
  }

  Blockly.Blocks['mission_emergency_stop'] = {
    init() {
      this.appendDummyInput().appendField('Mission: Emergency Stop')
      this.setPreviousStatement(true, null)
      this.setNextStatement(true, null)
      this.setColour('#d63c2a')
      this.setTooltip('Trigger emergency stop immediately')
    },
  }
}

/* ── Extract an ordered instruction list from the workspace ── */

function extractProgram(workspace) {
  const steps = []
  const topBlocks = workspace.getTopBlocks(true)
  for (const top of topBlocks) {
    let block = top
    while (block) {
      const type = block.type
      switch (type) {
        case 'move_forward':
          steps.push({ cmd: 'vel', linear: block.getFieldValue('SPEED'), angular: 0, duration: block.getFieldValue('DURATION') })
          break
        case 'move_backward':
          steps.push({ cmd: 'vel', linear: -block.getFieldValue('SPEED'), angular: 0, duration: block.getFieldValue('DURATION') })
          break
        case 'turn_left':
          steps.push({ cmd: 'vel', linear: 0, angular: block.getFieldValue('SPEED'), duration: block.getFieldValue('DURATION') })
          break
        case 'turn_right':
          steps.push({ cmd: 'vel', linear: 0, angular: -block.getFieldValue('SPEED'), duration: block.getFieldValue('DURATION') })
          break
        case 'stop':
          steps.push({ cmd: 'vel', linear: 0, angular: 0, duration: 0 })
          break
        case 'set_speed':
          steps.push({ cmd: 'vel', linear: block.getFieldValue('LINEAR'), angular: block.getFieldValue('ANGULAR'), duration: block.getFieldValue('DURATION') })
          break
        case 'wait':
          steps.push({ cmd: 'wait', duration: block.getFieldValue('DURATION') })
          break
        case 'mission_patrol':
          steps.push(
            { cmd: 'vel', linear: SPEED, angular: 0, duration: 3 },
            { cmd: 'vel', linear: 0, angular: TURN, duration: 1.57 },
            { cmd: 'vel', linear: SPEED, angular: 0, duration: 2 },
            { cmd: 'vel', linear: 0, angular: TURN, duration: 1.57 },
            { cmd: 'vel', linear: SPEED, angular: 0, duration: 3 },
            { cmd: 'vel', linear: 0, angular: TURN, duration: 1.57 },
            { cmd: 'vel', linear: SPEED, angular: 0, duration: 2 },
            { cmd: 'vel', linear: 0, angular: TURN, duration: 1.57 },
            { cmd: 'vel', linear: 0, angular: 0, duration: 0 },
          )
          break
        case 'mission_return_home':
          steps.push({ cmd: 'nav_goal', x: 0, y: 0, theta: 0 })
          break
        case 'mission_emergency_stop':
          steps.push({ cmd: 'estop' })
          break
        default:
          break
      }
      block = block.getNextBlock()
    }
  }
  return steps
}

/* ── Toolbox XML ────────────────────────────────────── */

const TOOLBOX_XML = `
<xml id="toolbox" style="display:none">
  <category name="Movement" colour="#1B3A6B">
    <block type="move_forward"></block>
    <block type="move_backward"></block>
    <block type="turn_left"></block>
    <block type="turn_right"></block>
    <block type="set_speed"></block>
    <block type="stop"></block>
    <block type="wait"></block>
  </category>
  <category name="Missions" colour="#F5C200">
    <block type="mission_patrol"></block>
    <block type="mission_return_home"></block>
    <block type="mission_emergency_stop"></block>
  </category>
</xml>
`

/* ── Component ──────────────────────────────────────── */

export default function BlocklyPanel({ send, disabled, onEStop }) {
  const containerRef = useRef(null)
  const workspaceRef = useRef(null)
  const abortRef = useRef(null)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState(null)
  const [stepIndex, setStepIndex] = useState(-1)
  const [totalSteps, setTotalSteps] = useState(0)

  /* Inject workspace once Blockly is available */
  useEffect(() => {
    const Blockly = window.Blockly
    if (!Blockly || !containerRef.current) return

    defineBlocks(Blockly)

    const ws = Blockly.inject(containerRef.current, {
      toolbox: TOOLBOX_XML,
      grid: { spacing: 20, length: 3, colour: '#dde3ee', snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 2, minScale: 0.4, scaleSpeed: 1.1 },
      trashcan: true,
      scrollbars: true,
      sounds: false,
      renderer: 'zelos',
      theme: Blockly.Theme.defineTheme('ares', {
        base: Blockly.Themes.Classic,
        fontStyle: { family: "'DM Mono', monospace", size: 11 },
        componentStyles: {
          workspaceBackgroundColour: '#f4f6fb',
          toolboxBackgroundColour: '#ffffff',
          toolboxForegroundColour: '#1a1917',
          flyoutBackgroundColour: '#f4f6fb',
          flyoutForegroundColour: '#1a1917',
          flyoutOpacity: 0.95,
          scrollbarColour: '#bdc8dc',
          scrollbarOpacity: 0.6,
        },
      }),
    })
    workspaceRef.current = ws

    return () => { ws.dispose() }
  }, [])

  /* Execute the program */
  const runProgram = useCallback(async () => {
    const ws = workspaceRef.current
    if (!ws || disabled) return

    const steps = extractProgram(ws)
    if (steps.length === 0) {
      setStatus('No blocks to run')
      return
    }

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setRunning(true)
    setTotalSteps(steps.length)
    setStatus('Running...')

    try {
      for (let i = 0; i < steps.length; i++) {
        if (ctrl.signal.aborted) throw new DOMException('Aborted', 'AbortError')
        setStepIndex(i)
        const step = steps[i]

        if (step.cmd === 'vel') {
          send({ type: 'cmd_vel', linear: step.linear, angular: step.angular })
          if (step.duration > 0) {
            await sleep(step.duration * 1000)
            if (ctrl.signal.aborted) throw new DOMException('Aborted', 'AbortError')
            send({ type: 'cmd_vel', linear: 0, angular: 0 })
          }
        } else if (step.cmd === 'nav_goal') {
          send({ type: 'nav_goal', x: step.x, y: step.y, theta: step.theta })
        } else if (step.cmd === 'estop') {
          if (onEStop) onEStop()
          else send({ type: 'estop' })
        } else if (step.cmd === 'wait') {
          await sleep(step.duration * 1000)
        }

        /* small gap between steps so the robot can settle */
        if (i < steps.length - 1 && step.cmd !== 'wait') {
          await sleep(150)
        }
      }
      setStatus('Done')
    } catch (e) {
      if (e.name === 'AbortError') {
        send({ type: 'cmd_vel', linear: 0, angular: 0 })
        setStatus('Stopped')
      } else {
        setStatus('Error: ' + e.message)
      }
    } finally {
      setRunning(false)
      setStepIndex(-1)
      abortRef.current = null
    }
  }, [send, disabled, onEStop])

  const stopProgram = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
  }, [])

  const clearWorkspace = useCallback(() => {
    if (workspaceRef.current) workspaceRef.current.clear()
    setStatus(null)
  }, [])

  const label = { fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }
  const btnBase = {
    padding: '6px 14px',
    fontFamily: "'DM Mono', monospace",
    fontSize: '10px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #dde3ee', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={label}>Block Coding</p>

      {/* Blockly workspace container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '340px',
          border: '1px solid #dde3ee',
          background: '#f4f6fb',
        }}
      />

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {!running ? (
          <button
            onClick={runProgram}
            disabled={disabled}
            style={{
              ...btnBase,
              backgroundColor: disabled ? 'transparent' : '#2a7d4f',
              borderColor: disabled ? '#dde3ee' : '#2a7d4f',
              color: disabled ? '#8896ab' : '#fff',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = '#F5C200'; e.currentTarget.style.color = '#1B3A6B'; e.currentTarget.style.borderColor = '#F5C200' } }}
            onMouseLeave={e => { if (!disabled) { e.currentTarget.style.background = '#2a7d4f'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#2a7d4f' } }}
          >
            Run
          </button>
        ) : (
          <button
            onClick={stopProgram}
            style={{
              ...btnBase,
              backgroundColor: '#d63c2a',
              borderColor: '#d63c2a',
              color: '#fff',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#b02d1f' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#d63c2a' }}
          >
            Stop
          </button>
        )}

        <button
          onClick={clearWorkspace}
          disabled={running}
          style={{
            ...btnBase,
            backgroundColor: 'transparent',
            borderColor: running ? '#dde3ee' : '#bdc8dc',
            color: running ? '#8896ab' : '#4a5568',
            cursor: running ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (!running) { e.currentTarget.style.borderColor = '#4a5568'; e.currentTarget.style.color = '#1a1917' } }}
          onMouseLeave={e => { if (!running) { e.currentTarget.style.borderColor = '#bdc8dc'; e.currentTarget.style.color = '#4a5568' } }}
        >
          Clear
        </button>

        {status && (
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '9px',
            letterSpacing: '1px',
            color: status === 'Done' ? '#2a7d4f' : status === 'Stopped' ? '#c47d0e' : status.startsWith('Error') ? '#d63c2a' : '#8896ab',
          }}>
            {status}{running && totalSteps > 0 ? ` (${stepIndex + 1}/${totalSteps})` : ''}
          </span>
        )}
      </div>
    </div>
  )
}
