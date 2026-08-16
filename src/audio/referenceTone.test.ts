import { getReferenceSampleUrl } from './referenceTone'
import { STANDARD_TUNING } from './tuning'

describe('reference guitar samples', () => {
  it('maps every standard-tuning string to its bundled FLAC note', () => {
    const filenames = STANDARD_TUNING.map((target) => getReferenceSampleUrl(target).split('/').at(-1))
    expect(filenames).toEqual(['E2.flac', 'A2.flac', 'D3.flac', 'G3.flac', 'B3.flac', 'E4.flac'])
  })
})
