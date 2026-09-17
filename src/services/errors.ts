/** Errores de dominio reutilizables por la capa de servicios. */

export class DuplicateRegistrationError extends Error {
  competitions: string[]

  constructor(competitions: string[]) {
    const list = competitions.map((c) => `«${c}»`).join(', ')
    super(`Ya estás inscrito en ${list}.`)
    this.name = 'DuplicateRegistrationError'
    this.competitions = competitions
  }
}

export class CompetitionClosedError extends Error {
  constructor(competition: string) {
    super(`Las inscripciones para ${competition} han finalizado.`)
    this.name = 'CompetitionClosedError'
  }
}

export class TeamFullError extends Error {
  constructor(team: string) {
    super(`Este equipo ya tiene el máximo de jugadores.`)
    this.name = 'TeamFullError'
    this.message = `Este equipo (${team}) ya tiene el máximo de jugadores.`
  }
}

export class CompetitionFullError extends Error {
  competition: string

  constructor(competition: string) {
    super(`Los cupos para «${competition}» están agotados.`)
    this.name = 'CompetitionFullError'
    this.competition = competition
  }
}

export class AlreadyCheckedInError extends Error {
  constructor() {
    super('Este atleta ya está acreditado en esta disciplina.')
    this.name = 'AlreadyCheckedInError'
  }
}