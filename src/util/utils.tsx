export function getSongArtistTitle(sid: string) {
  return sid.replace(/ \[(?:SyncedLyrics)\]/, '').split(' : ') as [string, string]
}

export function formatSongId(sid: string) {
  const [artist, title] = getSongArtistTitle(sid)
  return <><em>{artist}</em> - {title}</>
}

export function prepForCDNQuery(name: string) {
  return 'https://pub-d909a0daa125478d9db850d4da553bc4.r2.dev/' + encodeURIComponent(esc(name)).replace(/%(24|26|2B|2C|3B|3D)/g, '%25$1')
}

function esc(name: string) {
  return name
    .replace(/:/g, '：')
    .replace(/\?/g, '？')
    .replace(/"/g, '”')
    .replace(/</g, '＜')
    .replace(/>/g, '＞')
    .replace(/\|/g, '｜')
    .replace(/\*/g, '＊')
    .trim()
    .replace(/\.$/, '∙')
    .replace(/\\/g, '＼')
    .replace(/\//g, '／')
}
