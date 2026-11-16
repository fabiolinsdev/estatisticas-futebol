export type Source = {
  // null quando a fonte ainda não publicou o arquivo daquela Temporada.
  fetchCsv(file: { divisionCode: string; season: string }): Promise<string | null>;
};
