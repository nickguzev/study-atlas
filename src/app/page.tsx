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

interface Profile {
  ielts: number;
  gpa: number; // 0-100 normalized strength
  factors: string[];
}

interface ChanceResult {
  score: number;
  label: string;
  dot: 'green' | 'yellow' | 'red';
  englishScore: number;
  academicScore: number;
  extraScore: number;
  reasons: string[];
}

const LOW_VISA_RISK_COUNTRIES = ['Польша', 'Чехия', 'Венгрия', 'Нидерланды', 'Бельгия'];
const PAGE_SIZE = 15;
const FAVORITES_KEY = 'study-atlas-favorites';
const INTAKE_LABEL = 'сентябрь 2029';

const EXTRA_FACTORS = [
  { key: 'olympiad', label: 'Профильные олимпиады (мат./эконом.)' },
  { key: 'volunteer', label: 'Волонтёрство/соц. проекты' },
  { key: 'sport', label: 'Спорт (разряд/сборная)' },
  { key: 'essay', label: 'Сильное эссе готово' },
  { key: 'recommendation', label: 'Рекомендательные письма' },
  { key: 'sat', label: 'Готовность к SAT/ACT' },
];

const GPA_OPTIONS = [
  { key: '4.0', label: 'Средний балл ~4.0/5', strength: 58 },
  { key: '4.5', label: 'Средний балл ~4.5/5', strength: 75 },
  { key: '5.0', label: 'Средний балл 4.8–5.0/5', strength: 92 },
];

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

// ===== Personalized admission-chance mechanic =====
// This is a heuristic model for comparison purposes, not an admissions guarantee.
function computeChance(uni: University, profile: Profile): ChanceResult {
  const reasons: string[] = [];

  // English component: compare user's IELTS to university's minimum (if published)
  let englishScore: number;
  if (uni.ielts === null) {
    englishScore = 75;
    reasons.push('Вуз не публикует минимальный IELTS — принято нейтральное значение.');
  } else {
    const gap = profile.ielts - uni.ielts;
    englishScore = clampPct(70 + gap * 30);
    if (gap < 0) {
      reasons.push(`Ваш IELTS (${profile.ielts}) ниже требуемого (${uni.ielts}) — потребуется подтянуть язык.`);
    } else if (gap > 0) {
      reasons.push(`Ваш IELTS (${profile.ielts}) выше требуемого (${uni.ielts}) — сильная сторона профиля.`);
    } else {
      reasons.push(`Ваш IELTS точно соответствует требованию (${uni.ielts}).`);
    }
  }

  // Academic component: university selectivity (academics score) vs user's GPA strength
  const selectivity = uni.scoreBreakdown ? clampPct(uni.scoreBreakdown.academics) : 60;
  const academicScore = clampPct(100 - (selectivity - profile.gpa));
  if (selectivity - profile.gpa > 15) {
    reasons.push('Вуз академически селективный — при вашей успеваемости конкурс будет высоким.');
  } else if (profile.gpa - selectivity > 15) {
    reasons.push('Ваша успеваемость выше типичного профиля поступающих — хороший запас прочности.');
  }

  // Extra factors component
  const extraScore = clampPct((profile.factors.length / EXTRA_FACTORS.length) * 100);
  if (profile.factors.length >= 3) {
    reasons.push(`Отмечено ${profile.factors.length} доп. фактор(ов) — усиливает заявку при конкурсном отборе.`);
  } else if (profile.factors.length === 0) {
    reasons.push('Доп. факторы не отмечены — для конкурентных вузов стоит их добавить (эссе, рекомендации и т.д.).');
  }

  if (uni.foundation) {
    reasons.push('Вузу обычно требуется подготовительная программа Foundation при неполном соответствии профилю.');
  }

  const score = Math.round(englishScore * 0.35 + academicScore * 0.45 + extraScore * 0.20);

  let label: string;
  let dot: 'green' | 'yellow' | 'red';
  if (score >= 68) {
    label = 'Высокий';
    dot = 'green';
  } else if (score >= 45) {
    label = 'Средний';
    dot = 'yellow';
  } else {
    label = 'Низкий';
    dot = 'red';
  }

  return { score, label, dot, englishScore, academicScore, extraScore, reasons };
}

// ===== Admission roadmap generator =====
// NOTE: no university publishes official 2029 intake deadlines yet (they typically
// publish 12-18 months ahead). Dates below are modeled from each country's typical
// admission cycle pattern, scaled to a September 2029 intake — indicative, not
// confirmed official dates. Always verify with the university directly closer to the date.
type RoadmapStep = { date: string; title: string; desc: string };

function admissionSystemFor(country: string): string {
  if (country === 'Великобритания') return 'uk';
  if (country === 'Ирландия') return 'ie';
  if (country === 'Нидерланды') return 'nl';
  if (country === 'Германия' || country === 'Австрия') return 'de_at';
  if (country === 'США') return 'us';
  if (country === 'ОАЭ') return 'uae';
  return 'eu_rolling';
}

function buildRoadmap(uni: University): RoadmapStep[] {
  const system = admissionSystemFor(uni.country);
  const needsFoundation = uni.foundation;

  switch (system) {
    case 'uk':
      return [
        { date: 'Июнь–август 2028', title: 'Начало подготовки', desc: 'Выбор программы, работа над personal statement, при необходимости — курсы IELTS.' },
        { date: 'Сентябрь 2028', title: 'Регистрация в UCAS', desc: 'Создание заявки, выбор до 5 университетов.' },
        { date: '15 января 2029', title: 'Основной дедлайн UCAS', desc: 'Типичный крайний срок подачи для приёма в сентябре 2029 — уточняйте у конкретного вуза.' },
        { date: 'Февраль–май 2029', title: 'Условные предложения (offers)', desc: 'Университеты присылают conditional offer по итогам школьных оценок.' },
        { date: needsFoundation ? 'Май 2029' : 'Май–июнь 2029', title: needsFoundation ? 'Зачисление на Foundation' : 'Подтверждение Firm/Insurance', desc: needsFoundation ? 'При неполном соответствии требованиям — подготовительная программа перед основным курсом.' : 'Подтверждение основного и резервного варианта в UCAS.' },
        { date: 'Август 2029', title: 'Результаты экзаменов', desc: 'Публикация результатов A-level/IB, финальное подтверждение места (Clearing при необходимости).' },
        { date: 'Начало сентября 2029', title: 'Виза и заезд', desc: 'Student visa, заселение, начало занятий.' },
      ];
    case 'ie':
      return [
        { date: 'Осень 2028', title: 'Начало подготовки', desc: 'Выбор программы, подготовка документов и английского.' },
        { date: 'До 1 февраля 2029', title: 'Регистрация в CAO', desc: 'Ирландская централизованная система приёма заявок.' },
        { date: 'До 1 июля 2029', title: 'Change of Mind', desc: 'Последний срок корректировки списка приоритетных программ.' },
        { date: 'Конец августа 2029', title: 'Первый раунд предложений', desc: 'CAO публикует предложения по итогам школьных экзаменов.' },
        { date: 'Сентябрь 2029', title: 'Подтверждение и виза', desc: 'Подтверждение места, оформление студенческой визы Ирландии.' },
        { date: 'Начало сентября 2029', title: 'Начало занятий', desc: 'Заселение и старт учебного года.' },
      ];
    case 'nl':
      return [
        { date: 'Октябрь 2028', title: 'Начало подготовки', desc: 'Выбор программы, мотивационное письмо.' },
        { date: 'До 1 января 2029', title: 'Ранняя регистрация', desc: 'Для программ с ограниченным набором (numerus fixus) регистрация в Studielink часто открывается уже осенью.' },
        { date: 'До 1 мая 2029', title: 'Основной дедлайн Studielink', desc: 'Крайний срок подачи для большинства бакалаврских программ.' },
        { date: 'Май–июнь 2029', title: 'Matching', desc: 'Обязательные ознакомительные мероприятия — влияют на решение о зачислении.' },
        { date: 'Июль 2029', title: 'Подтверждение и оплата', desc: 'Подтверждение места, первый взнос за обучение.' },
        { date: 'Начало сентября 2029', title: 'Виза и заезд', desc: 'Оформление визы/ВНЖ при необходимости, заселение, начало занятий.' },
      ];
    case 'de_at':
      return [
        { date: 'Осень 2028', title: 'Начало подготовки', desc: 'Оценка признания аттестата — для многих поступающих из РФ потребуется Studienkolleg.' },
        { date: 'Зима 2028 – весна 2029', title: needsFoundation ? 'Studienkolleg и вступительный тест' : 'Языковая подготовка', desc: needsFoundation ? 'Поступление на Studienkolleg — обычно на семестр раньше основной программы.' : 'Подготовка немецкого/английского до требуемого уровня.' },
        { date: 'До 15 июля 2029', title: 'Дедлайн uni-assist / вуза', desc: 'Стандартный срок подачи на зимний семестр — точную дату подтверждайте у вуза.' },
        { date: 'Август 2029', title: 'Решение о зачислении', desc: 'Университет или uni-assist направляют результат рассмотрения.' },
        { date: 'Сентябрь 2029', title: 'Виза и регистрация', desc: 'Студенческая виза, регистрация по месту жительства (Anmeldung).' },
        { date: 'Октябрь 2029', title: 'Начало занятий', desc: 'В Германии и Австрии зимний семестр традиционно стартует в октябре — не в сентябре. Учитывайте при планировании.' },
      ];
    case 'us':
      return [
        { date: 'Весна–лето 2028', title: 'Подготовка', desc: 'SAT/ACT, эссе Common App, рекомендательные письма.' },
        { date: '1 ноября 2028', title: 'Early Decision/Action (опционально)', desc: 'Ранний раунд — обязывающий (ED) или необязывающий (EA) вариант, если вуз его предлагает.' },
        { date: '1 января 2029', title: 'Regular Decision — дедлайн', desc: 'Основной срок подачи для приёма в сентябре 2029.' },
        { date: 'Март 2029', title: 'Решения по заявкам', desc: 'Публикация результатов Regular Decision.' },
        { date: '1 мая 2029', title: 'National Decision Day', desc: 'Дедлайн подтверждения вуза и внесения депозита.' },
        { date: 'Июнь–июль 2029', title: 'Виза F-1', desc: 'Получение I-20, оплата SEVIS fee, интервью в посольстве.' },
        { date: 'Конец августа 2029', title: 'Заезд и ориентация', desc: 'Move-in day и вводная неделя перед началом занятий.' },
      ];
    case 'uae':
      return [
        { date: 'Осень 2028', title: 'Начало подготовки', desc: 'Выбор программы, подготовка английского при необходимости.' },
        { date: 'Февраль–июль 2029', title: 'Подача заявки', desc: 'Приём обычно идёт в рабочем порядке (rolling), без единого дедлайна.' },
        { date: 'Июль 2029', title: 'Подтверждение и оплата', desc: 'Подтверждение места, депозит за обучение.' },
        { date: 'Август 2029', title: 'Студенческая виза ОАЭ', desc: 'Оформление визы при поддержке вуза.' },
        { date: 'Начало сентября 2029', title: 'Заезд и начало занятий', desc: 'Заселение, вводная неделя, старт учебного года.' },
      ];
    default:
      return [
        { date: 'Осень 2028', title: 'Начало подготовки', desc: 'Выбор программы, подготовка мотивационного письма и документов.' },
        { date: 'Январь–июнь 2029', title: 'Подача заявки', desc: 'Приём чаще идёт в рабочем порядке — ранняя подача повышает шансы при ограниченном наборе.' },
        { date: 'Июнь–июль 2029', title: 'Решение о зачислении', desc: 'Университет направляет решение, при необходимости — приглашение на вступительный экзамен.' },
        { date: 'Июль 2029', title: 'Подтверждение и оплата', desc: 'Подтверждение места, депозит или первый взнос.' },
        { date: 'Август 2029', title: 'Виза и жильё', desc: 'Оформление студенческой визы, поиск жилья.' },
        { date: 'Начало сентября 2029', title: 'Заезд и начало занятий', desc: 'Заселение, ориентационная неделя, старт учебного года.' },
      ];
  }
}

function findSimilar(uni: University, all: University[], limit = 3): University[] {
  return all
    .filter((u) => u.id !== uni.id)
    .map((u) => {
      const sameCountry = u.country === uni.country ? 1 : 0;
      const scoreDist = Math.abs(u.assessment - uni.assessment);
      const budgetDist = Math.abs(u.budget_max - uni.budget_max) / (uni.budget_currency === 'USD' ? 90000 : 30000);
      const distance = scoreDist * 0.6 + budgetDist * 20 - sameCountry * 8;
      return { u, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((x) => x.u);
}

export default function Home() {
  const [englishKey, setEnglishKey] = useState('6.5');
  const [gpaKey, setGpaKey] = useState('4.5');
  const [factors, setFactors] = useState<string[]>([]);
  const [budget, setBudget] = useState(120000);
  const [country, setCountry] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [noFoundation, setNoFoundation] = useState(false);
  const [lowVisaRisk, setLowVisaRisk] = useState(false);
  const [sortBy, setSortBy] = useState('score');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'shortlist'>('cards');
  const [shortlist, setShortlist] = useState<number[]>([]);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [detailUni, setDetailUni] = useState<University | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const profile: Profile = useMemo(() => {
    const gpaOpt = GPA_OPTIONS.find((g) => g.key === gpaKey) || GPA_OPTIONS[1];
    return { ielts: parseFloat(englishKey), gpa: gpaOpt.strength, factors };
  }, [englishKey, gpaKey, factors]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_KEY);
      if (saved) setShortlist(JSON.parse(saved));
    } catch (e) {
      // localStorage unavailable — favorites just won't persist
    }
    setFavoritesLoaded(true);
  }, []);

  useEffect(() => {
    if (!favoritesLoaded) return;
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(shortlist));
    } catch (e) {
      // ignore
    }
  }, [shortlist, favoritesLoaded]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [country, noFoundation, lowVisaRisk, searchTerm, budget, sortBy]);

  useEffect(() => {
    document.body.style.overflow = (detailUni || showGuide) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [detailUni, showGuide]);

  const filtered = useMemo(() => {
    const result = (universities as University[]).filter((uni) => {
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

    const withChance = result.map((uni) => ({ uni, chance: computeChance(uni, profile) }));

    if (sortBy === 'budget_asc') {
      withChance.sort((a, b) => a.uni.budget_min - b.uni.budget_min);
    } else if (sortBy === 'budget_desc') {
      withChance.sort((a, b) => b.uni.budget_max - a.uni.budget_max);
    } else if (sortBy === 'ielts') {
      withChance.sort((a, b) => (a.uni.ielts || 999) - (b.uni.ielts || 999));
    } else if (sortBy === 'name') {
      withChance.sort((a, b) => a.uni.name.localeCompare(b.uni.name, 'ru'));
    } else if (sortBy === 'chance') {
      withChance.sort((a, b) => b.chance.score - a.chance.score);
    } else {
      withChance.sort((a, b) => b.uni.assessment - a.uni.assessment);
    }

    return withChance;
  }, [country, noFoundation, lowVisaRisk, searchTerm, budget, sortBy, profile]);

  const shortlistUniversities = useMemo(
    () => (universities as University[]).filter((u) => shortlist.includes(u.id)),
    [shortlist]
  );

  const toggleShortlist = (id: number) => {
    setShortlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleFactor = (key: string) => {
    setFactors((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  };

  const toggleCompare = (id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev; // capped at 4
      return [...prev, id];
    });
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
            <button className={viewMode !== 'shortlist' ? 'active' : ''} onClick={() => setViewMode('cards')}>Матрица</button>
            <button className={viewMode === 'shortlist' ? 'active' : ''} onClick={() => setViewMode('shortlist')}>Мой список ({shortlist.length})</button>
            <button onClick={() => setShowGuide(true)}>Справочник</button>
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
                визовые риски, бюджет, персональный шанс поступления. Карьерные перспективы, расчёт
                окупаемости и дорожная карта поступления — в карточке «Подробнее».
              </p>
            </div>

            <div className="profile-bar-wrap">
              <div className="profile-bar-row">
                <strong>Английский:</strong>
                <button className={`chip ${englishKey === '6.0' ? 'active' : ''}`} onClick={() => setEnglishKey('6.0')}>IELTS ~6.0</button>
                <button className={`chip ${englishKey === '6.5' ? 'active' : ''}`} onClick={() => setEnglishKey('6.5')}>IELTS ~6.5</button>
                <button className={`chip ${englishKey === '7.0' ? 'active' : ''}`} onClick={() => setEnglishKey('7.0')}>IELTS 7.0+</button>
              </div>

              <div className="profile-bar-row">
                <strong>Успеваемость:</strong>
                {GPA_OPTIONS.map((g) => (
                  <button key={g.key} className={`chip ${gpaKey === g.key ? 'active' : ''}`} onClick={() => setGpaKey(g.key)}>{g.label}</button>
                ))}
              </div>

              <div className="profile-bar-row">
                <strong>Доп. факторы:</strong>
                {EXTRA_FACTORS.map((f) => (
                  <button
                    key={f.key}
                    className={`chip ${factors.includes(f.key) ? 'active' : ''}`}
                    onClick={() => toggleFactor(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="profile-bar-row">
                <span className="profile-bar-hint">
                  Английский, успеваемость и доп. факторы пересчитывают персональный «Шанс поступления» на каждой карточке в реальном времени.
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
                  <InfoTip text={`Страны с исторически низким уровнем отказов в студенческой визе для граждан РФ: ${LOW_VISA_RISK_COUNTRIES.join(', ')}. Список ориентировочный.`} />
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
              <div className="sort-control">
                <span id="sort-label">Сортировка:</span>
                <select aria-labelledby="sort-label" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="score">По оценке вуза</option>
                  <option value="chance">По шансу поступления</option>
                  <option value="budget_asc">По бюджету (дешевле)</option>
                  <option value="budget_desc">По бюджету (дороже)</option>
                  <option value="ielts">По IELTS</option>
                  <option value="name">По названию</option>
                </select>
                <InfoTip text="«Оценка вуза» — общий балл (академика, бюджет, карьера, локация). «Шанс поступления» — персональный расчёт по вашему IELTS, успеваемости и доп. факторам. Оба — ориентир для сравнения, не официальный рейтинг." />
              </div>
              <div className="view-toggle">
                <button className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')}>▦ Карточки</button>
                <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>☰ Таблица</button>
              </div>
            </div>

            {viewMode === 'cards' && (
              <>
                <div className="cards-grid">
                  {visibleList.map(({ uni, chance }) => (
                    <UniCard
                      key={uni.id}
                      uni={uni}
                      chance={chance}
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
                list={visibleList.map((x) => x.uni)}
                chances={Object.fromEntries(visibleList.map((x) => [x.uni.id, x.chance]))}
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
              <p>Добавьте варианты в «Мой список» и сравните до 4 вузов бок о бок по бюджету, шансу поступления и требованиям.</p>
            </div>

            <p className="footer-note">
              Данные собраны из открытых источников, июль 2026. Оценки, персональный шанс поступления и карьерные прогнозы — ориентировочные.
              Перед подачей документов проверяйте актуальные требования на официальном сайте вуза.
            </p>
          </>
        )}

        {viewMode === 'shortlist' && (
          <ShortlistView
            list={shortlistUniversities}
            profile={profile}
            compareIds={compareIds}
            onToggleShortlist={toggleShortlist}
            onToggleCompare={toggleCompare}
            onOpenDetail={setDetailUni}
            onOpenCompare={() => setShowCompare(true)}
            onBack={() => setViewMode('cards')}
          />
        )}
      </div>

      {detailUni && (
        <DetailModal
          uni={detailUni}
          allUniversities={universities as University[]}
          profile={profile}
          inShortlist={shortlist.includes(detailUni.id)}
          onToggleShortlist={() => toggleShortlist(detailUni.id)}
          onClose={() => setDetailUni(null)}
          onSelectUni={(u) => setDetailUni(u)}
        />
      )}

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}

      {showCompare && (
        <CompareModal
          universities={(universities as University[]).filter((u) => compareIds.includes(u.id))}
          profile={profile}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}

// InfoTip — tap-friendly explanation icon.
// Fixed: no longer nested inside <label> (was hijacking label's implicit
// click-forwarding to the sibling form control, which broke the sort <select>
// and any button sharing the same label). No global document listener either —
// closes via a contained transparent overlay rendered only while open, so it
// can never interfere with unrelated clicks elsewhere on the page.
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="info-tip-wrap">
      <button
        type="button"
        className="info-tip-icon"
        aria-label="Пояснение"
        onClick={() => setOpen((o) => !o)}
      >
        ⓘ
      </button>
      {open && (
        <>
          <span className="info-tip-scrim" onClick={() => setOpen(false)} />
          <span className="info-tip-bubble">{text}</span>
        </>
      )}
    </span>
  );
}

function ChancePill({ chance }: { chance: ChanceResult }) {
  return (
    <div className={`chance-pill chance-pill-${chance.dot}`}>
      Шанс поступления при вашем профиле: <strong>{chance.label}</strong> ({chance.score}/100)
    </div>
  );
}

function UniCard({
  uni,
  chance,
  inShortlist,
  onToggleShortlist,
  onOpenDetail,
}: {
  uni: University;
  chance: ChanceResult;
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
        <span className={`dot dot-${uni.dot}`}></span>
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

      <ChancePill chance={chance} />

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
  chances,
  shortlist,
  onToggleShortlist,
  onOpenDetail,
}: {
  list: University[];
  chances: Record<number, ChanceResult>;
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
            <th>Шанс (персон.)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((uni) => {
            const chance = chances[uni.id];
            return (
              <tr key={uni.id}>
                <td className="table-name-cell">{uni.name}</td>
                <td>{uni.country} · {uni.city}</td>
                <td>{uni.program}</td>
                <td><span className={`score-badge small ${uni.dot}`}>{uni.assessment}</span></td>
                <td>{formatBudgetRange(uni)}</td>
                <td>{uni.ielts ?? '—'}</td>
                <td>{uni.foundation ? 'Да' : 'Нет'}</td>
                <td>{uni.qs ? `≈${uni.qs}` : '—'}</td>
                <td>{chance ? <span className={`chance-text ${chance.dot}`}>{chance.label} ({chance.score})</span> : '—'}</td>
                <td className="table-actions-cell">
                  <button className="btn tiny" onClick={() => onOpenDetail(uni)}>Подробнее</button>
                  <button className="btn tiny" onClick={() => onToggleShortlist(uni.id)}>
                    {shortlist.includes(uni.id) ? '✓' : '+'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ShortlistView({
  list,
  profile,
  compareIds,
  onToggleShortlist,
  onToggleCompare,
  onOpenDetail,
  onOpenCompare,
  onBack,
}: {
  list: University[];
  profile: Profile;
  compareIds: number[];
  onToggleShortlist: (id: number) => void;
  onToggleCompare: (id: number) => void;
  onOpenDetail: (uni: University) => void;
  onOpenCompare: () => void;
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

  const chances: Record<number, ChanceResult> = Object.fromEntries(
    list.map((u) => [u.id, computeChance(u, profile)])
  );

  return (
    <div className="shortlist-view">
      <div className="shortlist-header">
        <h2>Мой список ({list.length})</h2>
        <button className="btn" onClick={onBack}>← К матрице</button>
      </div>

      <div className="compare-picker-hint">
        Отметьте от 2 до 4 вузов галочкой в столбце слева, чтобы открыть сравнение бок о бок.
        {' '}Выбрано: <strong>{compareIds.filter((id) => list.some((u) => u.id === id)).length}</strong>/4
      </div>

      <div className="table-wrap">
        <table className="uni-table">
          <thead>
            <tr>
              <th></th>
              <th>Вуз</th>
              <th>Страна · Город</th>
              <th>Программа</th>
              <th>Оценка</th>
              <th>Бюджет/год</th>
              <th>Шанс (персон.)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((uni) => {
              const chance = chances[uni.id];
              return (
                <tr key={uni.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={compareIds.includes(uni.id)}
                      onChange={() => onToggleCompare(uni.id)}
                      disabled={!compareIds.includes(uni.id) && compareIds.length >= 4}
                    />
                  </td>
                  <td className="table-name-cell">{uni.name}</td>
                  <td>{uni.country} · {uni.city}</td>
                  <td>{uni.program}</td>
                  <td><span className={`score-badge small ${uni.dot}`}>{uni.assessment}</span></td>
                  <td>{formatBudgetRange(uni)}</td>
                  <td><span className={`chance-text ${chance.dot}`}>{chance.label} ({chance.score})</span></td>
                  <td className="table-actions-cell">
                    <button className="btn tiny" onClick={() => onOpenDetail(uni)}>Подробнее</button>
                    <button className="btn tiny" onClick={() => onToggleShortlist(uni.id)}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        className="btn load-more-btn"
        disabled={compareIds.filter((id) => list.some((u) => u.id === id)).length < 2}
        onClick={onOpenCompare}
      >
        Сравнить выбранные ({compareIds.filter((id) => list.some((u) => u.id === id)).length})
      </button>
    </div>
  );
}

function CompareModal({
  universities,
  profile,
  onClose,
}: {
  universities: University[];
  profile: Profile;
  onClose: () => void;
}) {
  const chances = universities.map((u) => computeChance(u, profile));

  const rows: { label: string; render: (u: University, i: number) => React.ReactNode }[] = [
    { label: 'Страна · Город', render: (u) => `${u.country} · ${u.city}` },
    { label: 'Программа', render: (u) => u.program },
    { label: 'Оценка вуза', render: (u) => `${u.assessment} / 100` },
    { label: 'Шанс поступления', render: (u, i) => `${chances[i].label} (${chances[i].score})` },
    { label: 'Бюджет/год', render: (u) => formatBudgetRange(u) },
    { label: 'IELTS мин', render: (u) => u.ielts ?? 'нет данных' },
    { label: 'Foundation', render: (u) => (u.foundation ? 'Да' : 'Нет') },
    { label: 'QS', render: (u) => (u.qs ? `≈${u.qs}` : 'нет данных') },
    { label: 'Зарплата выпускника', render: (u) => (u.career ? formatMoney(u.career.avgGraduateSalary, u.budget_currency) + '/год' : '—') },
    { label: 'ROI', render: (u) => (u.roi ? `+${u.roi.roiPercent}%` : '—') },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content compare-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        <h2 className="modal-title">Сравнение вузов</h2>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th></th>
                {universities.map((u) => <th key={u.id}>{u.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  <td className="compare-row-label">{row.label}</td>
                  {universities.map((u, i) => <td key={u.id}>{row.render(u, i)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        <h2 className="modal-title">Справочник</h2>

        <div className="modal-section">
          <h3>Как читать карточку вуза</h3>
          <p><strong>Оценка вуза (X/100)</strong> — общий балл: академическая репутация, бюджет, карьерные перспективы, локация и доступность поступления. Не является официальным рейтингом — это ориентир для сравнения между вузами в базе.</p>
          <p><strong>Шанс поступления при вашем профиле</strong> — персональный расчёт: сравнивает ваш IELTS, успеваемость и отмеченные доп. факторы с требованиями и селективностью вуза. Пересчитывается сразу при изменении профиля вверху страницы.</p>
        </div>

        <div className="modal-section">
          <h3>Термины</h3>
          <p><strong>Foundation</strong> — подготовительная программа перед основным бакалавриатом для тех, чей аттестат или язык не полностью соответствуют требованиям вуза напрямую.</p>
          <p><strong>QS</strong> — международный рейтинг университетов QS World University Rankings. Не все вузы (особенно небольшие бизнес-школы и liberal arts колледжи) в нём участвуют.</p>
          <p><strong>Низкий визовый риск</strong> — страны, где студенческие визы для граждан РФ исторически одобряются чаще. Ориентировочная оценка, не гарантия.</p>
          <p><strong>ROI</strong> — условный расчёт окупаемости: сколько лет потребуется, чтобы дополнительный заработок выпускника перекрыл стоимость обучения. Не учитывает налоги, инфляцию и кредит.</p>
        </div>

        <div className="modal-section">
          <h3>Как пользоваться</h3>
          <p>1. Настройте профиль (английский, успеваемость, доп. факторы) вверху страницы — карточки пересчитаются автоматически.</p>
          <p>2. Добавляйте интересные вузы в «Мой список» кнопкой «+ Список».</p>
          <p>3. В «Мой список» отметьте 2–4 вуза и нажмите «Сравнить» для таблицы бок о бок.</p>
          <p>4. Откройте «Подробнее» на карточке — там карьера, ROI, похожие вузы и дорожная карта поступления.</p>
        </div>

        <p className="modal-disclaimer">
          Все данные ориентировочные и собраны из открытых источников. Перед подачей документов всегда проверяйте актуальные требования на официальном сайте вуза.
        </p>
      </div>
    </div>
  );
}

function DetailModal({
  uni,
  allUniversities,
  profile,
  inShortlist,
  onToggleShortlist,
  onClose,
  onSelectUni,
}: {
  uni: University;
  allUniversities: University[];
  profile: Profile;
  inShortlist: boolean;
  onToggleShortlist: () => void;
  onClose: () => void;
  onSelectUni: (u: University) => void;
}) {
  const chance = computeChance(uni, profile);
  const roadmap = buildRoadmap(uni);
  const similar = findSimilar(uni, allUniversities);

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

        <div style={{ marginTop: '16px' }}>
          <ChancePill chance={chance} />
        </div>

        <div className="modal-section">
          <h3>Почему такой шанс</h3>
          <ul className="reasons-list">
            {chance.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <div className="score-breakdown" style={{ marginTop: '10px' }}>
            <div className="breakdown-item"><span>Английский</span><div className="bar"><div style={{ width: `${chance.englishScore}%` }}></div></div><span>{Math.round(chance.englishScore)}</span></div>
            <div className="breakdown-item"><span>Успеваемость</span><div className="bar"><div style={{ width: `${chance.academicScore}%` }}></div></div><span>{Math.round(chance.academicScore)}</span></div>
            <div className="breakdown-item"><span>Доп. факторы</span><div className="bar"><div style={{ width: `${chance.extraScore}%` }}></div></div><span>{Math.round(chance.extraScore)}</span></div>
          </div>
          <RecommendationBlock uni={uni} chance={chance} profile={profile} />
        </div>

        {uni.scoreBreakdown && (
          <div className="modal-section">
            <h3>Из чего складывается оценка вуза</h3>
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

        <div className="modal-section">
          <h3>Дорожная карта поступления — приём {INTAKE_LABEL}</h3>
          <p className="modal-disclaimer" style={{ marginBottom: '12px' }}>
            Ни один вуз пока не публикует официальные даты набора {INTAKE_LABEL} — приёмные комиссии обычно открывают точные сроки за 12–18 месяцев.
            Ниже — типичный цикл поступления для системы образования этой страны, пересчитанный на сентябрь 2029. Даты ориентировочные, уточняйте у вуза по мере приближения срока.
          </p>
          <div className="roadmap">
            {roadmap.map((step, i) => (
              <div key={i} className="roadmap-step">
                <div className="roadmap-date">{step.date}</div>
                <div className="roadmap-body">
                  <strong>{step.title}</strong>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {similar.length > 0 && (
          <div className="modal-section">
            <h3>Похожие университеты</h3>
            <div className="similar-list">
              {similar.map((s) => (
                <button key={s.id} className="similar-item" onClick={() => onSelectUni(s)}>
                  <span className="similar-name">{s.name}</span>
                  <span className="similar-meta">{s.country} · {s.assessment}/100 · {formatBudgetRange(s)}</span>
                </button>
              ))}
            </div>
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

function RecommendationBlock({ uni, chance, profile }: { uni: University; chance: ChanceResult; profile: Profile }) {
  const recs: string[] = [];

  if (uni.ielts !== null && profile.ielts < uni.ielts) {
    recs.push(`Подтяните английский минимум до IELTS ${uni.ielts} — сейчас это самая слабая часть заявки для этого вуза.`);
  }
  if (chance.academicScore < 55) {
    recs.push('Академический конкурс здесь высокий относительно вашей успеваемости — рассмотрите более доступные вузы из списка либо усильте профиль доп. факторами.');
  }
  if (profile.factors.length < 2) {
    recs.push('Добавьте минимум 2 доп. фактора (эссе, рекомендации, олимпиады) — это особенно важно для конкурентных программ.');
  }
  if (uni.foundation && chance.academicScore < 70) {
    recs.push('Рассмотрите заранее программу Foundation при этом вузе — это снижает риск отказа при неполном соответствии профилю.');
  }

  if (recs.length === 0) {
    return (
      <p className="modal-disclaimer" style={{ marginTop: '10px' }}>
        Профиль хорошо соответствует требованиям этого вуза по имеющимся данным — явных точек для улучшения не выявлено.
      </p>
    );
  }

  return (
    <div className="recommendation-block">
      <strong>Что улучшить в профиле для этого вуза:</strong>
      <ul>{recs.map((r, i) => <li key={i}>{r}</li>)}</ul>
    </div>
  );
}
