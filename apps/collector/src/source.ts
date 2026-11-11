export type Source = {
  fetchCsv(file: { divisionCode: string; season: string }): Promise<string>;
};
