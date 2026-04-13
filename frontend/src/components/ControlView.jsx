import EStop from './EStop'
import Teleop from './Teleop'
import NavGoalForm from './NavGoalForm'
import BlocklyPanel from './BlocklyPanel'

// Props:
//   send            – fn to send WebSocket messages
//   robotOnline     – boolean
//   teleopEnabled   – boolean
//   setTeleopEnabled – state setter
//   estopActive     – boolean, true while e-stop cooldown is active
//   handleEStop     – fn called when the E-Stop button is pressed
//   lastCmd         – string | null, last cmd_vel summary to display
export default function ControlView({ send, robotOnline, teleopEnabled, setTeleopEnabled, estopActive, handleEStop, lastCmd }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', gap: '24px' }}>

      {/* Left column – existing controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '320px', flexShrink: 0 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }}>
          Controls
        </p>

        <EStop onEStop={handleEStop} active={estopActive} disabled={!robotOnline} />

        <div style={{ background: '#fff', border: '1px solid #dde3ee', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '3px', textTransform: 'uppercase' }}>
              Manual Teleop
            </span>
            <button
              onClick={() => { if (!robotOnline || estopActive) return; setTeleopEnabled(v => !v) }}
              style={{
                padding: '4px 12px',
                fontFamily: "'DM Mono', monospace",
                fontSize: '9px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                border: '1px solid',
                cursor: (!robotOnline || estopActive) ? 'not-allowed' : 'pointer',
                opacity: (!robotOnline || estopActive) ? 0.4 : 1,
                backgroundColor: teleopEnabled ? '#1B3A6B' : 'transparent',
                borderColor: teleopEnabled ? '#1B3A6B' : '#bdc8dc',
                color: teleopEnabled ? '#ffffff' : '#4a5568',
                transition: 'all 0.15s',
              }}
            >
              {teleopEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <Teleop send={send} enabled={teleopEnabled && robotOnline && !estopActive} />

          {lastCmd && (
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: '#8896ab', letterSpacing: '1px', marginTop: '12px' }}>
              last: {lastCmd}
            </p>
          )}
        </div>

        <NavGoalForm send={send} disabled={teleopEnabled || estopActive || !robotOnline} />
      </div>

      {/* Right column – Blockly panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <BlocklyPanel
          send={send}
          disabled={estopActive || !robotOnline}
          onEStop={handleEStop}
        />
      </div>
    </div>
  )
}
