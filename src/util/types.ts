export type VoteToken = `${string}_${string}` // username_sessiontoken
export type QItem = {id: string; votes: VoteToken[]; requestedAt: number; waitingVotes: number}
export type Q = QItem[]
export type Config = { requestRateLimitMins: number, waitingVoteBonus: number }