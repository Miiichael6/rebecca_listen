/** WAV panel (spec §9.3): sample rate, channels and bit depth. */

import { CHANNEL_COUNTS, SAMPLE_RATES, WAV_BIT_DEPTHS } from '@shared/defaults'
import type { FilesDraft } from './application/useFilesDraft'
import { bitDepthLabel, channelsLabel, sampleRateLabel } from './domain/labels'
import { Choice, Section } from './Section'

export function WavSection({ draft }: { draft: FilesDraft }): React.JSX.Element {
  const { wav } = draft.files
  const { editWav } = draft

  return (
    <Section title="WAV" subtitle="Settings of the files recorded as .wav.">
      <Choice
        label="Sample rate"
        value={wav.sampleRate}
        options={SAMPLE_RATES}
        describe={sampleRateLabel}
        onChange={(sampleRate) => editWav({ sampleRate })}
      />
      <Choice
        label="Channels"
        value={wav.channels}
        options={CHANNEL_COUNTS}
        describe={channelsLabel}
        onChange={(channels) => editWav({ channels })}
      />
      <Choice
        label="Bit depth"
        value={wav.bitDepth}
        options={WAV_BIT_DEPTHS}
        describe={bitDepthLabel}
        onChange={(bitDepth) => editWav({ bitDepth })}
      />
    </Section>
  )
}
