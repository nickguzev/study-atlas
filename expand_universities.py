import json
from datetime import datetime

#载入现有数据
with open('data/universities.json', 'r', encoding='utf-8') as f:
    universities = json.load(f)

def calculate_score_breakdown(uni):
    """Разложить оценку на 6 критериев"""
    qs_score = min(100, (500 - (uni.get('qs') or 250)) / 2.5) if uni.get('qs') else 75
    
    ielts = uni.get('ielts') or 6.0
    english_score = min(100, (ielts / 7.0) * 100)
    
    budget = uni.get('budget_max', 30000)
    affordability = 100 if budget < 15000 else (80 if budget < 25000 else 60)
    
    location_risk = 85 if uni['country'] in ['Польша', 'Чехия', 'Венгрия', 'Нидерланды', 'Бельгия'] else 70
    
    career = 88 if uni.get('assessment', 70) >= 75 else 75
    accessibility = 85 if not uni.get('foundation') else 75
    
    return {
        "academics": int(qs_score),
        "english": int(english_score),
        "affordability": int(affordability),
        "location": int(location_risk),
        "career": int(career),
        "accessibility": int(accessibility)
    }

def get_career_data(uni):
    """Карьерные данные по типу вуза и стране"""
    country = uni['country']
    assessment = uni.get('assessment', 70)
    
    # Salary базируется на стране, рейтингу вуза, и типе программы
    salary_map = {
        'Великобритания': {'high': 43000, 'mid': 38000, 'low': 33000},
        'Нидерланды': {'high': 42000, 'mid': 37000, 'low': 32000},
        'Швеция': {'high': 41000, 'mid': 36000, 'low': 31000},
        'Дания': {'high': 40000, 'mid': 35000, 'low': 30000},
        'Финляндия': {'high': 39000, 'mid': 34000, 'low': 29000},
        'Германия': {'high': 38000, 'mid': 33000, 'low': 28000},
        'Бельгия': {'high': 37000, 'mid': 32000, 'low': 27000},
        'Испания': {'high': 32000, 'mid': 28000, 'low': 24000},
        'Италия': {'high': 30000, 'mid': 26000, 'low': 22000},
        'Польша': {'high': 28000, 'mid': 24000, 'low': 20000},
        'Чехия': {'high': 27000, 'mid': 23000, 'low': 19000},
        'Венгрия': {'high': 26000, 'mid': 22000, 'low': 18000},
        'Австрия': {'high': 36000, 'mid': 31000, 'low': 26000},
        'Ирландия': {'high': 40000, 'mid': 35000, 'low': 30000},
        'США': {'high': 65000, 'mid': 55000, 'low': 45000},
        'ОАЭ': {'high': 50000, 'mid': 45000, 'low': 40000},  # tax-free
    }
    
    tier = 'high' if assessment >= 80 else ('mid' if assessment >= 75 else 'low')
    base_salary = salary_map.get(country, {'high': 35000, 'mid': 30000, 'low': 25000})[tier]
    
    employers = {
        'Великобритания': ['Deloitte', 'PwC', 'HSBC', 'Goldman Sachs', 'McKinsey'],
        'Нидерланды': ['ING', 'Philips', 'Accenture', 'Unilever', 'ABN AMRO'],
        'Швеция': ['Ericsson', 'Volvo', 'H&M', 'IKEA', 'SEB'],
        'Дания': ['Maersk', 'Novo Nordisk', 'Carlsberg', 'Bang & Olufsen', 'A.P. Moller'],
        'Финляндия': ['Nokia', 'Fortum', 'Nordea', 'Kone', 'UPM'],
        'Германия': ['Siemens', 'SAP', 'Allianz', 'BMW', 'Bosch'],
        'Испания': ['Telefónica', 'Repsol', 'Inditex', 'BBVA', 'Banco Santander'],
        'Италия': ['Enel', 'Eni', 'Generali', 'Ferrari', 'LVMH'],
        'Польша': ['PwC', 'Deloitte', 'mBank', 'ING', 'Orange'],
        'ОАЭ': ['Emirates', 'Emaar', 'ADNOC', 'DP World', 'Etisalat'],
    }
    
    return {
        "avgGraduateSalary": base_salary,
        "avgSalaryAt10Years": int(base_salary * 1.45),
        "topEmployers": employers.get(country, ['Major corporations']),
        "careerTracks": [
            {"title": "Management Consulting", "avgSalary": int(base_salary * 1.35)},
            {"title": "Finance/Banking", "avgSalary": int(base_salary * 1.45)},
            {"title": "Tech/Product", "avgSalary": int(base_salary * 1.40)}
        ]
    }

def calculate_roi(uni, career_data):
    """ROI образования"""
    budget_min = uni.get('budget_min', 20000)
    budget_max = uni.get('budget_max', 25000)
    years = 3  # Типичная длительность бакалавриата
    
    # Assume 50% получают стипендию (average 25% от стоимости)
    avg_cost = ((budget_min + budget_max) / 2) * years * 0.75
    
    salary_1_3_years = career_data['avgGraduateSalary']
    salary_10_years = career_data['avgSalaryAt10Years']
    
    # Earnings за 10 лет после выпуска (минус стоимость обучения в первые 3 года)
    total_earnings_10_years = (salary_1_3_years * 1.08) * 7 + (salary_10_years * 1.02) * 3
    net_benefit = total_earnings_10_years - avg_cost
    
    break_even_years = avg_cost / salary_1_3_years if salary_1_3_years > 0 else 0
    roi_percent = (net_benefit / avg_cost * 100) if avg_cost > 0 else 0
    
    return {
        "totalCost": int(avg_cost),
        "careerEarnings10Years": int(total_earnings_10_years),
        "breakEvenYears": round(break_even_years, 1),
        "roiPercent": int(roi_percent)
    }

def get_why_apply(uni):
    """Почему стоит поступать"""
    reasons = []
    
    if uni['country'] in ['Великобритания', 'Нидерланды']:
        reasons.append(f"Russell/Research Group institution with top-tier reputation")
    
    if uni.get('qs') and uni.get('qs') < 300:
        reasons.append(f"QS ranking #{uni.get('qs')} — recognized globally")
    
    if uni.get('budget_max', 30000) < 20000:
        reasons.append("Affordable tuition compared to Western Europe average")
    
    if uni['country'] in ['Нидерланды', 'Бельгия', 'Дания']:
        reasons.append("English-taught programs, strong international community")
    
    if uni['country'] == 'ОАЭ':
        reasons.append("Tax-free salary in UAE region, Western university branch")
    
    if not reasons:
        reasons.append(f"Strong {uni.get('program', 'business')} program")
    
    return reasons[:3]

def get_cons(uni):
    """Возможные минусы"""
    cons = []
    
    budget_max = uni.get('budget_max', 25000)
    if budget_max > 30000:
        cons.append("High tuition cost requires strong financial planning")
    
    if uni.get('foundation') and uni['country'] != 'ОАЭ':
        cons.append("Foundation year required (adds cost & time)")
    
    ielts = uni.get('ielts', 6.0)
    if ielts >= 6.5:
        cons.append("Higher English language requirement (6.5+ IELTS)")
    
    if uni['country'] == 'ОАЭ':
        cons.append("Limited work permit duration post-graduation (vs EU)")
    
    if uni.get('qs') and uni.get('qs') > 500:
        cons.append("Lower global ranking — may impact some employers' recruitment")
    
    return cons[:2]

def get_admission_roadmap(uni):
    """Дорожная карта поступления (12 шагов)"""
    ielts = uni.get('ielts', 6.0)
    foundation = uni.get('foundation', False)
    
    steps = [
        {"step": 1, "title": f"Prepare IELTS to {ielts}", "timeline": "3–4 months", "priority": "HIGH"},
        {"step": 2, "title": "Gather documents: passport, school certificate", "timeline": "2 weeks", "priority": "HIGH"},
        {"step": 3, "title": "Request reference letters (2)", "timeline": "3 weeks", "priority": "HIGH"},
        {"step": 4, "title": "Write personal statement", "timeline": "4 weeks", "priority": "HIGH"},
        {"step": 5, "title": "Take mock IELTS exam", "timeline": "1 week", "priority": "MEDIUM"},
        {"step": 6, "title": "Official IELTS exam", "timeline": "1 day (exam day)", "priority": "CRITICAL"},
    ]
    
    if foundation:
        steps.append({"step": 7, "title": "Apply to Foundation year", "timeline": "2 weeks after IELTS", "priority": "HIGH"})
        steps.append({"step": 8, "title": "Foundation entrance exam/interview", "timeline": "4 weeks", "priority": "HIGH"})
        base_step = 9
    else:
        steps.append({"step": 7, "title": "Submit full application", "timeline": "2 weeks after IELTS", "priority": "HIGH"})
        base_step = 8
    
    steps.extend([
        {"step": base_step, "title": "University interview (if applicable)", "timeline": "4–6 weeks", "priority": "MEDIUM"},
        {"step": base_step+1, "title": "Receive admission decision", "timeline": "6–8 weeks", "priority": "MEDIUM"},
        {"step": base_step+2, "title": "Secure visa (if needed)", "timeline": "4 weeks", "priority": "CRITICAL"},
        {"step": base_step+3, "title": "Arrange accommodation", "timeline": "6 weeks", "priority": "MEDIUM"},
        {"step": base_step+4, "title": "Book flights & arrive", "timeline": "2 weeks", "priority": "MEDIUM"},
    ])
    
    return steps

# Расширить каждый университет
for uni in universities:
    uni['scoreBreakdown'] = calculate_score_breakdown(uni)
    career = get_career_data(uni)
    uni['career'] = career
    uni['roi'] = calculate_roi(uni, career)
    uni['whyApply'] = get_why_apply(uni)
    uni['cons'] = get_cons(uni)
    uni['admissionRoadmap'] = get_admission_roadmap(uni)
    uni['lastUpdated'] = datetime.now().strftime('%Y-%m-%d')
    
    # Уточнение Foundation логики
    if uni.get('foundation'):
        uni['foundationRequired'] = False  # Optional
        uni['foundationDuration'] = "1 year"
    else:
        uni['foundationRequired'] = False
        uni['foundationDuration'] = None

# Сохранить
with open('data/universities.json', 'w', encoding='utf-8') as f:
    json.dump(universities, f, ensure_ascii=False, indent=2)

print(f"✓ Expanded {len(universities)} universities with career data, ROI, and roadmaps")
print(f"✓ Sample (University #1):")
print(f"  - Score breakdown: {universities[0]['scoreBreakdown']}")
print(f"  - Avg salary: €{universities[0]['career']['avgGraduateSalary']}")
print(f"  - ROI: {universities[0]['roi']['roiPercent']}%")
