'use client';

import { useState, useMemo, useEffect } from 'react';
import europeWest from '../../data/universities-europe-west.json';
import europeEast from '../../data/universities-europe-east.json';
import usa from '../../data/universities-usa.json';
import dubai from '../../data/universities-dubai.json';
import './page.css';

const universities = [...europeWest, ...europeEast, ...usa, ...dubai];

interface ScoreBreakdown {
  academics: number;
  english: number;
  affordability: number;
  location: number;
  career: number;
  accessibility: number;
}

interface CareerTrack {
  title: string;
  avgSalary: number;
}

interface CareerData {
  avgGraduateSalary: number;
  avgSalaryAt10Years: number;
  topEmployers: string[];
  careerTracks: CareerTrack[];
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

const LOW_VISA_RISK_COUNTRIES = ['Польша', 'Чехия', 'Венгрия', 'Нидерланды', 'Бельгия'];
const PAGE_SIZE = 15;
const FAVORITES_KEY = 'study-atlas-favorites';

function formatMoney(amount: number, currency: string): string {
  const symbol = currency === 'USD' ? '$' : '€';
  return `${symbol}${amount.toLocaleString('ru-RU')}`;
}

function clampPct(v: number | undefined | null): number {
  if (v === undefined || v === null || isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function formatBudgetRange(uni: University): string {
  const symbol = uni.budget_currency === 'USD' ? '$' : '€';
  return `${symbol}${uni.budget_min.toLocaleString('ru-RU')}–${uni.budget_max.toLocaleString('ru-RU')}`;
}

export default function Home() {
  const [english, setEnglish] = useState('6.5');
  const [gpa, setGpa] = useState('4.5');
  const [budget, setBudget] = useState(120000);
  const [country, setCountry] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [noFoundation, setNoFoundation] = useState(false);
  const [lowVisaRisk, setLowVisaRisk] = useState(false);
  const [sortBy, setSortBy] = useState('score');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'shortlist'>('cards');
  const [shortlist, setShortlist] = useState<number[]>([]);
  const [detailUni, setDetailUni] = useState<University | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      if (saved) setShortlist(JSON.parse(saved));
    } catch (e) {
      // localStorage unavailable — ignore, favorites just won't persist
    }
    setFavoritesLoaded(true);
  }, []);

  // Persist favorites whenever they change (after initial load)
  useEffect(() => {
    if (!favoritesLoaded) return;
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(shortlist));
    } catch (e) {
      // ignore
    }
  }, [shortlist, favoritesLoaded]);

  // Reset pagination whenever filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [country, noFoundation, lowVisaRisk, searchTerm, budget, sortBy]);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = detailUni ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [detailUni]);

  const filtered = useMemo(() => {
    let result = (universities as University[]).filter((uni) => {
      let match = true;

      if (country && uni.country !== country) match = false;
      if (noFoundation && uni.foundation) match = false;
      if (lowVisaRisk && !LOW_VISA_RISK_COUNTRIES.includes(uni.country)) match = false;

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

      const budgetInEur = uni.budget_currency === 'USD' ? uni.budget_max * 0.92 : uni.budget_max;
      if (budgetInEur > budget) match = false;

      return match;
    });

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

  const shortlistUniversities = useMemo(
    () => (universities as University[]).filter((u) => shortlist.includes(u.id)),
    [shortlist]
  );

  const toggleShortlist = (id: number) => {
    setShortlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const countries = useMemo(() => {
    return Array.from(new Set((universities as University[]).map((u) => u.country))).sort();
  }, []);

  const resetFilters = () => {
    setCountry('');
    setSearchTerm('');
    setNoFoundation(false);
    setLowVisaRisk(false);
    setBudget(120000);
  };

  const visibleList = filtered.slice(0, visibleCount);

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-title">🎓 Study Atlas</span>
            <span className="brand-sub">Навигатор поступления за рубежом</span>
          </div>
          <nav className="nav">
            <button
              className={viewMode !== 'shortlist' ? 'active' : ''}
              onClick={() => setViewMode('cards')}
            >
              Матрица
            </button>
            <button
              className={viewMode === 'shortlist' ? 'active' : ''}
              onClick={() => setViewMode('shortlist')}
            >
              Мой список ({shortlist.length})
            </button>
          </nav>
        </div>
      </header>

      <div className="shell">
        {viewMode !== 'shortlist' && (
          <>
            <div className="hero">
              <h1>Навигатор поступления за рубежом</h1>
              <p>
                67 университетов Европы, США и ОАЭ по экономике, финансам и бизнесу — Foundation,
                визовые риски, бюджет, шанс поступления одним словом. Карьерные перспективы и расчёт
                окупаемости обучения — в карточке «Подробнее».
              </p>
            </div>

            <div className="profile-bar-wrap">
              <div className="profile-bar-row">
                <strong>Английский:</strong>
                <button className={`chip ${english === '6.0' ? 'active' : ''}`} onClick={() => setEnglish('6.0')}>IELTS ~6.0</button>
                <button className={`chip ${english === '6.5' ? 'active' : ''}`} onClick={() => setEnglish('6.5')}>IELTS ~6.5</button>
                <button className={`chip ${english === '7.0' ? 'active' : ''}`} onClick={() => setEnglish('7.0')}>IELTS 7.0+</button>
              </div>

              <div className="profile-bar-row">
                <strong>Успеваемость:</strong>
                <button className={`chip ${gpa === '4.0' ? 'active' : ''}`} onClick={() => setGpa('4.0')}>Средний балл ~4.0/5</button>
                <button className={`chip ${gpa === '4.5' ? 'active' : ''}`} onClick={() => setGpa('4.5')}>Средний балл ~4.5/5</button>
                <button className={`chip ${gpa === '5.0' ? 'active' : ''}`} onClick={() => setGpa('5.0')}>Средний балл 4.8–5.0/5</button>
              </div>

              <div className="profile-bar-row">
                <span className="profile-bar-hint">
                  Учитывается английский, средний балл и до 6 доп. факторов — определяют слово «Шанс поступления» на карточках.
                </span>
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
                <select className="select-input" value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">+ Страна…</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  className={`filter-toggle ${noFoundation ? 'active' : ''}`}
                  onClick={() => setNoFoundation(!noFoundation)}
                >
                  Без Foundation
                </button>
                <span className="filter-with-tip">
                  <button
                    className={`filter-toggle ${lowVisaRisk ? 'active' : ''}`}
                    onClick={() => setLowVisaRisk(!lowVisaRisk)}
                  >
                    Низкий визовый риск
                  </button>
                  <InfoTip text={`Страны с исторически низким уровнем отказов в студенческой визе для граждан РФ: ${LOW_VISA_RISK_COUNTRIES.join(', ')}. Список ориентировочный и может меняться.`} />
                </span>
              </div>

              <div className="filters-row">
                <label style={{ fontSize: '.82rem', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Бюджет до €{budget.toLocaleString('ru-RU')}/год
                  <input
                    type="range"
                    min="2000"
                    max="120000"
                    step="1000"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="filters-meta">
                <span>Найдено: <strong>{filtered.length}</strong> из <strong>{universities.length}</strong></span>
                <button className="reset-link" onClick={resetFilters}>Сбросить фильтры</button>
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
                <InfoTip text="Оценка складывается из академической репутации, стоимости обучения, карьерных перспектив, локации, доступности поступления и уровня английского. Это ориентир для сравнения, а не официальный рейтинг." />
              </label>
              <div className="view-toggle">
                <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}>▦ Карточки</button>
                <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>☰ Таблица</button>
              </div>
            </div>

            {viewMode === 'cards' && (
              <>
                <div className="cards-grid">
                  {visibleList.map((uni) => (
                    <UniCard
                      key={uni.id}
                      uni={uni}
                      inShortlist={shortlist.includes(uni.id)}
                      onToggleShortlist={() => toggleShortlist(uni.id)}
                      onOpenDetail={() => setDetailUni(uni)}
                    />
                  ))}
                </div>
                {visibleCount < filtered.length && (
                  <div className="load-more-wrap">
                    <button className="btn load-more-btn" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                      Показать ещё ({filtered.length - visibleCount})
                    </button>
                  </div>
                )}
              </>
            )}

            {viewMode === 'table' && (
              <UniTable
                list={visibleList}
                shortlist={shortlist}
                onToggleShortlist={toggleShortlist}
                onOpenDetail={setDetailUni}
              />
            )}
            {viewMode === 'table' && visibleCount < filtered.length && (
              <div className="load-more-wrap">
                <button className="btn load-more-btn" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                  Показать ещё ({filtered.length - visibleCount})
                </button>
              </div>
            )}

            <div className="cta-block">
              <strong>Не уверены, какой вуз выбрать?</strong>
              <p>Добавьте несколько вариантов в «Мой список» — там можно сравнить их бюджет, шанс поступления и требования в одной таблице.</p>
            </div>

            <p className="footer-note">
              Данные собраны из открытых источников, июль 2026. Оценки и карьерные прогнозы — ориентировочные.
              Перед подачей документов проверяйте актуальные требования на официальном сайте вуза.
            </p>
          </>
        )}

        {viewMode === 'shortlist' && (
          <ShortlistView
            list={shortlistUniversities}
            onToggleShortlist={toggleShortlist}
            onOpenDetail={setDetailUni}
            onBack={() => setViewMode('cards')}
          />
        )}
      </div>

      {detailUni && (
        <DetailModal
          uni={detailUni}
          inShortlist={shortlist.includes(detailUni.id)}
          onToggleShortlist={() => toggleShortlist(detailUni.id)}
          onClose={() => setDetailUni(null)}
        />
      )}
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = () => setOpen(false);
    document.addEventListener('click', closeOnOutsideClick);
    return () => document.removeEventListener('click', closeOnOutsideClick);
  }, [open]);

  return (
    <span className="info-tip-wrap">
      <button
        type="button"
        className="info-tip-icon"
        aria-label="Пояснение"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        ⓘ
      </button>
      {open && (
        <span className="info-tip-bubble" onClick={(e) => e.stopPropagation()}>
          {text}
        </span>
      )}
    </span>
  );
}

function UniCard({
  uni,
  inShortlist,
  onToggleShortlist,
  onOpenDetail,
}: {
  uni: University;
  inShortlist: boolean;
  onToggleShortlist: () => void;
  onOpenDetail: () => void;
}) {
  return (
    <div className="uni-card">
      <div className="uni-card-top">
        <div>
          <div className="uni-card-flagline">{uni.country} · {uni.city}</div>
          <div className="uni-card-name">{uni.name}</div>
          <div className="uni-card-program">{uni.program}</div>
        </div>
        <span className={`dot dot-${uni.dot}`} title="Статус по общей оценке"></span>
      </div>

      <span className={`score-badge ${uni.dot}`}>{uni.assessment} / 100</span>

      {uni.scoreBreakdown && (
        <div className="score-breakdown">
          <div className="breakdown-item">
            <span>Учёба</span>
            <div className="bar"><div style={{ width: `${clampPct(uni.scoreBreakdown.academics)}%` }}></div></div>
            <span>{clampPct(uni.scoreBreakdown.academics)}</span>
          </div>
          <div className="breakdown-item">
            <span>Карьера</span>
            <div className="bar"><div style={{ width: `${clampPct(uni.scoreBreakdown.career)}%` }}></div></div>
            <span>{clampPct(uni.scoreBreakdown.career)}</span>
          </div>
          <div className="breakdown-item">
            <span>Бюджет</span>
            <div className="bar"><div style={{ width: `${clampPct(uni.scoreBreakdown.affordability)}%` }}></div></div>
            <span>{clampPct(uni.scoreBreakdown.affordability)}</span>
          </div>
        </div>
      )}

      <div className="uni-card-stats">
        <div>
          <span>Бюджет/год</span>
          {formatBudgetRange(uni)}
        </div>
        <div>
          <span>IELTS мин</span>
          {uni.ielts ?? (
            <span className="stat-with-tip">
              нет данных
              <InfoTip text="Единого требования нет либо вуз не публикует эту позицию — уточняйте индивидуально в приёмной комиссии." />
            </span>
          )}
        </div>
        <div>
          <span>Foundation</span>
          {uni.foundation ? 'Да' : 'Нет'}
        </div>
        <div>
          <span>QS</span>
          {uni.qs ? `≈${uni.qs}` : (
            <span className="stat-with-tip">
              нет данных
              <InfoTip text="Вуз не входит в общий рейтинг QS или не публикует эту позицию — типично для liberal arts колледжей и небольших бизнес-школ." />
            </span>
          )}
        </div>
      </div>

      {uni.whyApply && uni.whyApply.length > 0 && (
        <div className="why-apply">
          <strong>✓ Почему поступать:</strong>
          <ul>{uni.whyApply.map((reason, i) => <li key={i}>{reason}</li>)}</ul>
        </div>
      )}

      {uni.cons && uni.cons.length > 0 && (
        <div className="cons">
          <strong>⚠ Возможные минусы:</strong>
          <ul>{uni.cons.map((con, i) => <li key={i}>{con}</li>)}</ul>
        </div>
      )}

      <div className={`chance-pill chance-pill-${uni.dot}`}>
        Шанс поступления: <strong>{uni.chance}</strong>
      </div>

      <div className="uni-card-actions">
        <button className="btn" onClick={onOpenDetail}>▶ Подробнее</button>
        <button className="btn" onClick={onToggleShortlist}>
          {inShortlist ? '✓ Список' : '+ Список'}
        </button>
      </div>

      {uni.lastUpdated && (
        <div className="card-footer">Данные обновлены: {uni.lastUpdated}</div>
      )}
    </div>
  );
}

function UniTable({
  list,
  shortlist,
  onToggleShortlist,
  onOpenDetail,
}: {
  list: University[];
  shortlist: number[];
  onToggleShortlist: (id: number) => void;
  onOpenDetail: (uni: University) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="uni-table">
        <thead>
          <tr>
            <th>Вуз</th>
            <th>Страна · Город</th>
            <th>Программа</th>
            <th>Оценка</th>
            <th>Бюджет/год</th>
            <th>IELTS</th>
            <th>Foundation</th>
            <th>QS</th>
            <th>Шанс</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((uni) => (
            <tr key={uni.id}>
              <td className="table-name-cell">{uni.name}</td>
              <td>{uni.country} · {uni.city}</td>
              <td>{uni.program}</td>
              <td><span className={`score-badge small ${uni.dot}`}>{uni.assessment}</span></td>
              <td>{formatBudgetRange(uni)}</td>
              <td>{uni.ielts ?? '—'}</td>
              <td>{uni.foundation ? 'Да' : 'Нет'}</td>
              <td>{uni.qs ? `≈${uni.qs}` : '—'}</td>
              <td><span className={`chance-text ${uni.dot}`}>{uni.chance}</span></td>
              <td className="table-actions-cell">
                <button className="btn tiny" onClick={() => onOpenDetail(uni)}>Подробнее</button>
                <button className="btn tiny" onClick={() => onToggleShortlist(uni.id)}>
                  {shortlist.includes(uni.id) ? '✓' : '+'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShortlistView({
  list,
  onToggleShortlist,
  onOpenDetail,
  onBack,
}: {
  list: University[];
  onToggleShortlist: (id: number) => void;
  onOpenDetail: (uni: University) => void;
  onBack: () => void;
}) {
  if (list.length === 0) {
    return (
      <div className="shortlist-empty">
        <p>Список пока пуст. Добавляйте вузы кнопкой «+ Список» в матрице — они появятся здесь для сравнения.</p>
        <button className="btn" onClick={onBack}>← К матрице</button>
      </div>
    );
  }

  return (
    <div className="shortlist-view">
      <div className="shortlist-header">
        <h2>Мой список ({list.length})</h2>
        <button className="btn" onClick={onBack}>← К матрице</button>
      </div>
      <UniTable
        list={list}
        shortlist={list.map((u) => u.id)}
        onToggleShortlist={onToggleShortlist}
        onOpenDetail={onOpenDetail}
      />
    </div>
  );
}

function DetailModal({
  uni,
  inShortlist,
  onToggleShortlist,
  onClose,
}: {
  uni: University;
  inShortlist: boolean;
  onToggleShortlist: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>

        <div className="modal-flagline">{uni.country} · {uni.city}</div>
        <h2 className="modal-title">{uni.name}</h2>
        <div className="modal-program">{uni.program}</div>

        <span className={`score-badge ${uni.dot}`}>{uni.assessment} / 100</span>

        <div className="uni-card-stats" style={{ marginTop: '16px' }}>
          <div><span>Бюджет/год</span>{formatBudgetRange(uni)}</div>
          <div><span>IELTS мин</span>{uni.ielts ?? 'нет данных'}</div>
          <div><span>Foundation</span>{uni.foundation ? 'Да' : 'Нет'}</div>
          <div><span>QS рейтинг</span>{uni.qs ? `≈${uni.qs}` : 'нет данных'}</div>
        </div>

        <div className={`chance-pill chance-pill-${uni.dot}`} style={{ marginTop: '16px' }}>
          Шанс поступления: <strong>{uni.chance}</strong>
        </div>

        {uni.scoreBreakdown && (
          <div className="modal-section">
            <h3>Из чего складывается оценка</h3>
            <div className="score-breakdown">
              <div className="breakdown-item"><span>Учёба</span><div className="bar"><div style={{ width: `${clampPct(uni.scoreBreakdown.academics)}%` }}></div></div><span>{clampPct(uni.scoreBreakdown.academics)}</span></div>
              <div className="breakdown-item"><span>Английский</span><div className="bar"><div style={{ width: `${clampPct(uni.scoreBreakdown.english)}%` }}></div></div><span>{clampPct(uni.scoreBreakdown.english)}</span></div>
              <div className="breakdown-item"><span>Бюджет</span><div className="bar"><div style={{ width: `${clampPct(uni.scoreBreakdown.affordability)}%` }}></div></div><span>{clampPct(uni.scoreBreakdown.affordability)}</span></div>
              <div className="breakdown-item"><span>Локация</span><div className="bar"><div style={{ width: `${clampPct(uni.scoreBreakdown.location)}%` }}></div></div><span>{clampPct(uni.scoreBreakdown.location)}</span></div>
              <div className="breakdown-item"><span>Карьера</span><div className="bar"><div style={{ width: `${clampPct(uni.scoreBreakdown.career)}%` }}></div></div><span>{clampPct(uni.scoreBreakdown.career)}</span></div>
              <div className="breakdown-item"><span>Доступность</span><div className="bar"><div style={{ width: `${clampPct(uni.scoreBreakdown.accessibility)}%` }}></div></div><span>{clampPct(uni.scoreBreakdown.accessibility)}</span></div>
            </div>
          </div>
        )}

        {uni.whyApply && uni.whyApply.length > 0 && (
          <div className="modal-section why-apply">
            <h3>✓ Почему поступать</h3>
            <ul>{uni.whyApply.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </div>
        )}

        {uni.cons && uni.cons.length > 0 && (
          <div className="modal-section cons">
            <h3>⚠ Возможные минусы</h3>
            <ul>{uni.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </div>
        )}

        {uni.career && (
          <div className="modal-section">
            <h3>Карьерные перспективы</h3>
            <p>Средняя зарплата выпускника: <strong>{formatMoney(uni.career.avgGraduateSalary, uni.budget_currency)}</strong>/год</p>
            <p>Через 10 лет: <strong>{formatMoney(uni.career.avgSalaryAt10Years, uni.budget_currency)}</strong>/год</p>
            {uni.career.careerTracks && uni.career.careerTracks.length > 0 && (
              <div className="career-tracks">
                {uni.career.careerTracks.map((t, i) => (
                  <div key={i} className="career-track-row">
                    <span>{t.title}</span>
                    <strong>{formatMoney(t.avgSalary, uni.budget_currency)}</strong>
                  </div>
                ))}
              </div>
            )}
            <p className="modal-disclaimer">
              Зарплатные ориентиры усреднены по стране и направлению — не являются гарантией и не привязаны к конкретному вузу.
            </p>
          </div>
        )}

        {uni.roi && (
          <div className="modal-section roi-info">
            <h3>Расчёт окупаемости</h3>
            <p>Полная стоимость обучения: <strong>{formatMoney(uni.roi.totalCost, uni.budget_currency)}</strong></p>
            <p>Заработок за 10 лет после выпуска: <strong>{formatMoney(uni.roi.careerEarnings10Years, uni.budget_currency)}</strong></p>
            <p>ROI: <strong style={{ color: '#4caf50' }}>+{uni.roi.roiPercent}%</strong></p>
            <p>Окупаемость: <strong>{uni.roi.breakEvenYears} года</strong> после выпуска</p>
            <p className="modal-disclaimer">
              Расчёт условный: не учитывает налоги, инфляцию, кредит на обучение и разброс зарплат внутри профессии.
            </p>
          </div>
        )}

        {uni.lastUpdated && <div className="card-footer">Данные обновлены: {uni.lastUpdated}</div>}

        <div className="modal-actions">
          <button className="btn" onClick={onToggleShortlist}>
            {inShortlist ? '✓ В списке' : '+ Добавить в список'}
          </button>
        </div>
      </div>
    </div>
  );
}
