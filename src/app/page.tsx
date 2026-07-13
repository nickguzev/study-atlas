'use client';

import { useState, useMemo } from 'react';
import europeWest from '../../data/universities-europe-west.json';
import europeEast from '../../data/universities-europe-east.json';
import usa from '../../data/universities-usa.json';
import dubai from '../../data/universities-dubai.json';

// Combine all universities
const universities = [...europeWest, ...europeEast, ...usa, ...dubai];
import './page.css';

interface ScoreBreakdown {
  academics: number;
  english: number;
  affordability: number;
  location: number;
  career: number;
  accessibility: number;
}

interface CareerData {
  avgGraduateSalary: number;
  avgSalaryAt10Years: number;
  topEmployers: string[];
  careerTracks: Array<{ title: string; avgSalary: number }>;
}

interface ROIData {
  totalCost: number;
  careerEarnings10Years: number;
  breakEvenYears: number;
  roiPercent: number;
}

interface University {
  id: number;
  name: string;
  country: string;
  city: string;
  program: string;
  budget_min: number;
  budget_max: number;
  budget_currency: string;
  ielts: number | null;
  foundation: boolean;
  qs: number | null;
  assessment: number;
  dot: string;
  chance: string;
  scoreBreakdown?: ScoreBreakdown;
  career?: CareerData;
  roi?: ROIData;
  whyApply?: string[];
  cons?: string[];
  lastUpdated?: string;
}

export default function Home() {
  const [english, setEnglish] = useState('6.5');
  const [gpa, setGpa] = useState('4.5');
  const [budget, setBudget] = useState(100000);
  const [country, setCountry] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [noFoundation, setNoFoundation] = useState(false);
  const [lowVisaRisk, setLowVisaRisk] = useState(false);
  const [sortBy, setSortBy] = useState('score');
  const [viewMode, setViewMode] = useState('cards');
  const [shortlist, setShortlist] = useState<number[]>([]);
  const [userMode, setUserMode] = useState<'student' | 'parent'>('parent');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const lowVisaRiskCountries = ['Польша', 'Чехия', 'Венгрия', 'Нидерланды', 'Бельгия'];

  const filtered = useMemo(() => {
    let result = universities.filter((uni: University) => {
      let match = true;

      if (country && uni.country !== country) match = false;
      if (noFoundation && uni.foundation) match = false;
      if (lowVisaRisk && !lowVisaRiskCountries.includes(uni.country)) match = false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !uni.name.toLowerCase().includes(term) &&
          !uni.city.toLowerCase().includes(term) &&
          !uni.program.toLowerCase().includes(term)
        ) {
          match = false;
        }
      }

      // Budget filter (convert to EUR for comparison)
      const budgetInEur = uni.budget_currency === 'USD' ? uni.budget_max * 0.92 : uni.budget_max;
      if (budgetInEur > budget) match = false;

      return match;
    });

    // Sort
    if (sortBy === 'budget_asc') {
      result.sort((a, b) => a.budget_min - b.budget_min);
    } else if (sortBy === 'budget_desc') {
      result.sort((a, b) => b.budget_max - a.budget_max);
    } else if (sortBy === 'ielts') {
      result.sort((a, b) => (a.ielts || 999) - (b.ielts || 999));
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    } else {
      result.sort((a, b) => b.assessment - a.assessment);
    }

    return result;
  }, [country, noFoundation, lowVisaRisk, searchTerm, budget, sortBy]);

  const toggleShortlist = (id: number) => {
    setShortlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getCountries = () => {
    const countries = new Set(universities.map((u: University) => u.country));
    return Array.from(countries).sort();
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-title">🎓 Study Atlas</span>
            <span className="brand-sub">Персональный навигатор поступления</span>
          </div>
          <nav className="nav">
            <button className="active">Матрица</button>
            <button className="">Мой список</button>
            <button className="">FAQ</button>
          </nav>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="mode-toggle">
              <button
                className={userMode === 'student' ? 'active' : ''}
                onClick={() => setUserMode('student')}
              >
                👤 Абитуриент
              </button>
              <button
                className={userMode === 'parent' ? 'active' : ''}
                onClick={() => setUserMode('parent')}
              >
                👨‍👩‍👧 Родитель
              </button>
            </div>
            <button className="shortlist-pill">❤ {shortlist.length}</button>
          </div>
        </div>
      </header>

      <div className="shell">
        <div className="hero">
          <h1>Персональный навигатор поступления за рубежом</h1>
          <p>
            Найдите идеальный университет для вашего ребёнка с учётом академии, карьеры, инвестиций и визовых рисков. 
            67 университетов Европы, США и ОАЭ с детальным анализом ROI, карьерных перспектив и стоимости образования.
          </p>
          {userMode === 'parent' && (
            <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
              💡 Режим родителя: видите зарплаты выпускников, ROI образования и финансовые сценарии.
            </div>
          )}
        </div>

        <div className="profile-bar-wrap">
          <div className="profile-bar-row">
            <strong>Английский:</strong>
            <button
              className={`chip ${english === '6.0' ? 'active' : ''}`}
              onClick={() => setEnglish('6.0')}
            >
              IELTS ~6.0
            </button>
            <button
              className={`chip ${english === '6.5' ? 'active' : ''}`}
              onClick={() => setEnglish('6.5')}
            >
              IELTS ~6.5
            </button>
            <button
              className={`chip ${english === '7.0' ? 'active' : ''}`}
              onClick={() => setEnglish('7.0')}
            >
              IELTS 7.0+
            </button>
          </div>

          <div className="profile-bar-row">
            <strong>Успеваемость:</strong>
            <button
              className={`chip ${gpa === '4.0' ? 'active' : ''}`}
              onClick={() => setGpa('4.0')}
            >
              Средний балл ~4.0/5
            </button>
            <button
              className={`chip ${gpa === '4.5' ? 'active' : ''}`}
              onClick={() => setGpa('4.5')}
            >
              Средний балл ~4.5/5
            </button>
            <button
              className={`chip ${gpa === '5.0' ? 'active' : ''}`}
              onClick={() => setGpa('5.0')}
            >
              Средний балл 4.8–5.0/5
            </button>
          </div>

          <div className="profile-bar-row">
            <span className="profile-bar-hint">Учитывается английский, средний балл и до 6 доп. факторов — определяют слово «Шанс поступления» на карточках.</span>
          </div>
        </div>

        <div className="filters">
          <div className="filters-row">
            <input
              className="search-input"
              placeholder="Поиск по вузу, городу, программе…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="select-input"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">+ Страна…</option>
              {getCountries().map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              className={`filter-toggle ${noFoundation ? 'active' : ''}`}
              onClick={() => setNoFoundation(!noFoundation)}
            >
              Без Foundation
            </button>
            <button
              className={`filter-toggle ${lowVisaRisk ? 'active' : ''}`}
              onClick={() => setLowVisaRisk(!lowVisaRisk)}
            >
              Низкий визовый риск
            </button>
          </div>

          <div className="filters-row">
            <label style={{ fontSize: '.82rem', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Бюджет до €{(budget * 0.92).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}/год
              <input
                type="range"
                min="2000"
                max="100000"
                step="1000"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="filters-meta">
            <span>Найдено: <strong>{filtered.length}</strong> из <strong>{universities.length}</strong></span>
            <button className="reset-link" onClick={() => {
              setCountry('');
              setSearchTerm('');
              setNoFoundation(false);
              setLowVisaRisk(false);
              setBudget(100000);
            }}>
              Сбросить фильтры
            </button>
          </div>
        </div>

        <div className="toolbar-row">
          <label className="sort-control">
            Сортировка:
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="score">По оценке</option>
              <option value="budget_asc">По бюджету (дешевле)</option>
              <option value="budget_desc">По бюджету (дороже)</option>
              <option value="ielts">По IELTS</option>
              <option value="name">По названию</option>
            </select>
          </label>
          <div className="view-toggle">
            <button
              className={viewMode === 'cards' ? 'active' : ''}
              onClick={() => setViewMode('cards')}
            >
              ▦ Карточки
            </button>
            <button
              className={viewMode === 'table' ? 'active' : ''}
              onClick={() => setViewMode('table')}
            >
              ☰ Таблица
            </button>
          </div>
        </div>

        {viewMode === 'cards' && (
          <div className="cards-grid">
            {filtered.map((uni: University) => (
              <div key={uni.id} className={`uni-card ${expandedCard === uni.id ? 'expanded' : ''}`}>
                <div className="uni-card-top">
                  <div>
                    <div className="uni-card-flagline">{uni.country} · {uni.city}</div>
                    <div className="uni-card-name">{uni.name}</div>
                    <div className="uni-card-program">{uni.program}</div>
                  </div>
                  <span className={`dot dot-${uni.dot}`} title="Статус"></span>
                </div>
                
                <span className={`score-badge ${uni.dot}`}>{uni.assessment} / 100</span>
                
                {/* Score Breakdown */}
                {uni.scoreBreakdown && (
                  <div className="score-breakdown">
                    <div className="breakdown-item">
                      <span>Академия</span>
                      <div className="bar"><div style={{ width: `${uni.scoreBreakdown.academics}%` }}></div></div>
                      <span>{uni.scoreBreakdown.academics}</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Карьера</span>
                      <div className="bar"><div style={{ width: `${uni.scoreBreakdown.career}%` }}></div></div>
                      <span>{uni.scoreBreakdown.career}</span>
                    </div>
                    <div className="breakdown-item">
                      <span>Бюджет</span>
                      <div className="bar"><div style={{ width: `${uni.scoreBreakdown.affordability}%` }}></div></div>
                      <span>{uni.scoreBreakdown.affordability}</span>
                    </div>
                  </div>
                )}
                
                <div className="uni-card-stats">
                  <div>
                    <span>Бюджет/год</span>
                    {uni.budget_currency === 'USD' ? `$${uni.budget_min.toLocaleString('ru-RU')}–${uni.budget_max.toLocaleString('ru-RU')}` : `€${uni.budget_min.toLocaleString('ru-RU')}–${uni.budget_max.toLocaleString('ru-RU')}`}
                  </div>
                  <div>
                    <span>IELTS мин</span>
                    {uni.ielts || '—'}
                  </div>
                  <div>
                    <span>Foundation</span>
                    {uni.foundation ? 'Да' : 'Нет'}
                  </div>
                  <div>
                    <span>QS</span>
                    {uni.qs ? `≈${uni.qs}` : '—'}
                  </div>
                </div>
                
                {/* Why Apply */}
                {uni.whyApply && uni.whyApply.length > 0 && (
                  <div className="why-apply">
                    <strong>✓ Почему поступать:</strong>
                    <ul>
                      {uni.whyApply.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Cons */}
                {uni.cons && uni.cons.length > 0 && (
                  <div className="cons">
                    <strong>⚠ Возможные минусы:</strong>
                    <ul>
                      {uni.cons.map((con, i) => (
                        <li key={i}>{con}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Career & ROI (Parent Mode) */}
                {userMode === 'parent' && uni.career && uni.roi && (
                  <div className="parent-mode-info">
                    <div className="career-info">
                      <strong>Карьерные перспективы:</strong>
                      <p>Средняя зарплата выпускника: <strong>€{uni.career.avgGraduateSalary.toLocaleString('ru-RU')}</strong>/год</p>
                      <p>Через 10 лет: <strong>€{uni.career.avgSalaryAt10Years.toLocaleString('ru-RU')}</strong>/год</p>
                    </div>
                    <div className="roi-info">
                      <strong>Инвестиционный расчёт:</strong>
                      <p>Стоимость обучения: <strong>€{uni.roi.totalCost.toLocaleString('ru-RU')}</strong></p>
                      <p>Заработки за 10 лет: <strong>€{uni.roi.careerEarnings10Years.toLocaleString('ru-RU')}</strong></p>
                      <p>ROI: <strong style={{ color: '#4caf50' }}>+{uni.roi.roiPercent}%</strong></p>
                      <p>Окупаемость: <strong>{uni.roi.breakEvenYears} лет</strong> после выпуска</p>
                    </div>
                  </div>
                )}
                
                <div className={`chance-pill chance-pill-${uni.dot}`}>
                  Шанс поступления: <strong>{uni.chance}</strong>
                </div>
                
                <div className="uni-card-actions">
                  <button 
                    className="btn" 
                    onClick={() => setExpandedCard(expandedCard === uni.id ? null : uni.id)}
                  >
                    {expandedCard === uni.id ? '▼ Скрыть' : '▶ Подробнее'}
                  </button>
                  <button className="btn" onClick={() => toggleShortlist(uni.id)}>
                    {shortlist.includes(uni.id) ? '✓ Список' : '+ Список'}
                  </button>
                </div>
                
                {uni.lastUpdated && (
                  <div className="card-footer">
                    Данные обновлены: {uni.lastUpdated}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="footer-note">Данные собраны из открытых источников, июль 2026. Перед подачей проверяйте актуальные требования на сайте вуза.</p>
      </div>
    </div>
  );
}
