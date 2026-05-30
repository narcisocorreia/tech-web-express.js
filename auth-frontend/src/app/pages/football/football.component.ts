import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgClass } from '@angular/common';
import { environment } from '../../../environments/environment';

interface League {
  idLeague: string;
  strLeague: string;
  strSport: string;
  strCountry: string;
  strLeagueAlternate: string;
}

interface StandingEntry {
  intRank: string;
  idTeam: string;
  strTeam: string;
  strBadge: string;
  intPlayed: string;
  intWin: string;
  intLoss: string;
  intDraw: string;
  intGoalsFor: string;
  intGoalsAgainst: string;
  intGoalDifference: string;
  intPoints: string;
  strDescription: string;
}

@Component({
  selector: 'app-football',
  templateUrl: './football.component.html',
  styleUrls: ['./football.component.css'],
  standalone: true,
  imports: [NgClass],
})
export class FootballComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  leagues = signal<League[]>([]);
  standings = signal<StandingEntry[]>([]);
  selectedLeague = signal<League | null>(null);
  loadingLeagues = signal(false);
  loadingStandings = signal(false);
  error = signal<string | null>(null);

  readonly season = '2024-2025';

  ngOnInit() {
    this.loadLeagues();
  }

  loadLeagues() {
    this.loadingLeagues.set(true);
    this.error.set(null);
    this.http
      .get<{ leagues: League[] }>(`${this.apiUrl}/football/leagues`)
      .subscribe({
        next: (data) => {
          this.leagues.set(data.leagues ?? []);
          this.loadingLeagues.set(false);
        },
        error: () => {
          this.error.set(
            'Erro ao carregar ligas. Verifica se o backend está a correr.',
          );
          this.loadingLeagues.set(false);
        },
      });
  }

  selectLeague(league: League) {
    this.selectedLeague.set(league);
    this.standings.set([]);
    this.error.set(null);
    this.loadingStandings.set(true);
    this.http
      .get<{
        table: StandingEntry[];
      }>(`${this.apiUrl}/football/standings/${league.idLeague}?season=${this.season}`)
      .subscribe({
        next: (data) => {
          this.standings.set(data.table ?? []);
          this.loadingStandings.set(false);
          if (!data.table || data.table.length === 0) {
            this.error.set(
              'Sem dados de classificação para esta liga / época.',
            );
          }
        },
        error: () => {
          this.error.set('Erro ao carregar classificação.');
          this.loadingStandings.set(false);
        },
      });
  }

  rowClass(entry: StandingEntry): string {
    const desc = (entry.strDescription ?? '').toLowerCase();
    if (desc.includes('champions league')) return 'table-success';
    if (desc.includes('europa league')) return 'table-primary';
    if (desc.includes('conference')) return 'table-info';
    if (desc.includes('relegation')) return 'table-danger';
    return '';
  }

  clearSelection() {
    this.selectedLeague.set(null);
    this.standings.set([]);
    this.error.set(null);
  }
}
