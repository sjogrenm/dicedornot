
export interface Cell {
    x?: number;
    y?: number;
}

export interface TeamState {

}

export interface SkillInfo {
    SkillId: number;
}

export interface BoardState {

};

export interface Player {
    Id: PlayerId,
};

export type PlayerId = number & { __isPlayerId: any };

export interface Replay { }
