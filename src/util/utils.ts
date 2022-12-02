export function formatSongId(s: string) {
  return s.replace(' : ', ' - ').replace(/ \[(?:SyncedLyrics)\]/, '')
}