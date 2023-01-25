import { Genre } from "./Context";

export type VoteToken = `${string}_${string}` // username_sessiontoken
export type QItem = {id: string; votes: VoteToken[]; requestedAt: number; waitingVotes: number}
export type Q = QItem[]
export type Config = { requestRateLimitMins: number, waitingVoteBonus: number, bgPict?: BgPicture }

export type BgPicture = [file: string, filter?: string]

export type SongListItem = {
  /** Artist : Title */
  id: string
  /** language */
  l?: string
  /** comment */
  c?: string
  /** source */
  s?: string
  /** album */
  a?: string
  /** year */
  y?: number
  /** edition. s=singstar */
  e?: 's'
  // /** genre */
  // g?: string
}
export type EnhancedSongListItem = SongListItem & {g: Genre, selected?: true}
/** folder structure */
export type SongList = Record<string, SongListItem[]>
export type EnhancedSongList = Record<string, EnhancedSongListItem[]>
