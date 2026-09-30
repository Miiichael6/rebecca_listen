/** MP3 panel (spec §9.2, plan/images/06): sample rate, channels, CBR/VBR and its bitrate or quality. */

import {
  CHANNEL_COUNTS,
  MP3_BITRATES_KBPS,
  MP3_MODES,
  MP3_VBR_QUALITY,
  SAMPLE_RATES
} from '@shared/defaults'
import type { FilesDraft } from './application/useFilesDraft'
import {
  bitrateLabel,
  channelsLabel,
  levels,
  sampleRateLabel,
  vbrQualityLabel
} from './domain/labels'
import { Choice, Section } from './Section'

const VBR_LEVELS = levels(MP3_VBR_QUALITY.min, MP3_VBR_QUALITY.max)

export function Mp3Section({ draft }: { draft: FilesDraft }): React.JSX.Element {
  const { mp3 } = draft.files
  const { editMp3 } = draft

  return (
    <Section title="MP3" subtitle="Settings of the files recorded as .mp3.">
      <Choice
        label="Sample rate"
        value={mp3.sampleRate}
        options={SAMPLE_RATES}
        describe={sampleRateLabel}
        onChange={(sampleRate) => editMp3({ sampleRate })}
      />
      <Choice
        label="Channels"
        value={mp3.channels}
        options={CHANNEL_COUNTS}
        describe={channelsLabel}
        onChange={(channels) => editMp3({ channels })}
      />
      <Choice
        label="Mode"
        value={mp3.mode}
        options={MP3_MODES}
        describe={(mode) => mode.toUpperCase()}
        onChange={(mode) => editMp3({ mode })}
      />
      {mp3.mode === 'cbr' ? (
        <Choice
          label="Bitrate"
          value={mp3.bitrateKbps}
          options={MP3_BITRATES_KBPS}
          describe={bitrateLabel}
          onChange={(bitrateKbps) => editMp3({ bitrateKbps })}
        />
      ) : (
        <Choice
          label="Quality (V0 is the best)"
          value={mp3.quality}
          options={VBR_LEVELS}
          describe={vbrQualityLabel}
          onChange={(quality) => editMp3({ quality })}
        />
      )}
    </Section>
  )
}
