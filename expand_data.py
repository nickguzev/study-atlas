import json
from datetime import datetime

with open('data/universities.json', 'r', encoding='utf-8') as f:
    universities = json.load(f)

def calculate_score_breakdown(uni):
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
    country = uni['country']
    assessment = uni.get('assessment', 70)
    
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
        'ОАЭ': {'high': 50000, 'mid': 45000, 'low': 40000},
    }
    
    tier = 'high' if assessment >= 80 else ('mid' if assessment >= 75 else 'low')
    base_salary = salary_map.get(country, {'high': 35000, 'mid': 30000, 'low': 25000})[tier]
    
    employers = {
        'Великобритания': ['Deloitte', 'PwC', 'HSBC', 'Goldman Sachs'],
        'Нидерланды': ['ING', 'Philips', 'Accenture', 'Unilever'],
        'ОАЭ': ['Emirates', 'Emaar', 'ADNOC', 'DP World'],
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
    budget_min = uni.get('budget_min', 20000)
    budget_max = uni.get('budget_max', 25000)
    years = 3
    avg_cost = ((budget_min + budget_max) / 2) * years * 0.75
    salary_1_3_years = career_data['avgGraduateSalary']
    salary_10_years = career_data['avgSalaryAt10Years']
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
    reasons = []
    if uni['country'] in ['Великобритания', 'Нидерланды']:
        reasons.append("Top-tier European university with global recognition")
    if uni.get('qs') and uni.get('qs') < 300:
        reasons.append(f"Strong QS ranking — excellent for career prospects")
    if uni.get('budget_max', 30000) < 20000:
        reasons.append("Affordable tuition, excellent value for investment")
    if uni['country'] == 'ОАЭ':
        reasons.append("Tax-free salary region, Western campus quality")
    if not reasons:
        reasons.append(f"Specialized {uni.get('program', 'business')} program")
    return reasons[:3]

def get_cons(uni):
    cons = []
    budget_max = uni.get('budget_max', 25000)
    if budget_max > 30000:
        cons.append("High tuition cost — requires careful financial planning")
    if uni.get('foundation'):
        cons.append("Foundation year required (additional 1 year + cost)")
    ielts = uni.get('ielts', 6.0)
    if ielts >= 6.5:
        cons.append("Higher English requirement — demanding preparation")
    if uni.get('qs') and uni.get('qs') > 500:
        cons.append("Lower ranking may limit some recruitment channels")
    return cons[:2]

for uni in universities:
    uni['scoreBreakdown'] = calculate_score_breakdown(uni)
    career = get_career_data(uni)
    uni['career'] = career
    uni['roi'] = calculate_roi(uni, career)
    uni['whyApply'] = get_why_apply(uni)
    uni['cons'] = get_cons(uni)
    uni['lastUpdated'] = "2026-07-13"

with open('data/universities.json', 'w', encoding='utf-8') as f:
    json.dump(universities, f, ensure_ascii=False, indent=2)

print(f"✓ Expanded {len(universities)} universities")
print(f"Sample — University #1:")
print(f"  Why: {universities[0]['whyApply']}")
print(f"  Salary: €{universities[0]['career']['avgGraduateSalary']}")
print(f"  ROI: +{universities[0]['roi']['roiPercent']}%")
