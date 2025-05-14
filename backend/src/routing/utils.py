from typing import Dict, Optional


def get_russian_forms(object_name: str, gender: str) -> Dict[str, str]:
    special_cases = {
        "пользователь": {
            "именительный": "Пользователь",
            "родительный": "Пользователя",
            "винительный": "Пользователя",  
            "творительный": "Пользователем",
            "plural": "Пользователи",
            "genitive_plural": "Пользователей",
            "найден": "найден",
            "удален": "удален",
            "создан": "создан",
        },
        "роль": {
            "именительный": "Роль",
            "родительный": "Роли",
            "винительный": "Роль",
            "творительный": "Ролью",
            "plural": "Роли",
            "genitive_plural": "Ролей",
            "найден": "найдена",
            "удален": "удалена",
            "создан": "создана",
        }
    }
    
    if object_name in special_cases:
        return special_cases[object_name]
    
    forms = {
        "m": {
            "именительный": object_name,
            "родительный": f"{object_name}а",
            "винительный": object_name,
            "творительный": f"{object_name}ом",
            "plural": f"{object_name}ы",
            "genitive_plural": f"{object_name}ов",
            "найден": "найден",
            "удален": "удален",
            "создан": "создан",
        },
        "f": {
            "именительный": object_name,
            "родительный": f"{object_name}и",
            "винительный": f"{object_name}у",
            "творительный": f"{object_name}ой",
            "plural": f"{object_name}ы",
            "genitive_plural": f"{object_name}",
            "найден": "найдена",
            "удален": "удалена",
            "создан": "создана",
        },
        "n": {
            "именительный": object_name,
            "родительный": f"{object_name}а",
            "винительный": object_name,
            "творительный": f"{object_name}ом",
            "plural": f"{object_name}а",
            "genitive_plural": f"{object_name}",
            "найден": "найдено",
            "удален": "удалено",
            "создан": "создано",
        },
    }
    
    if gender == "m" and object_name in ["Документ", "Пациент"]:
        if object_name == "Пациент":  # одушевленное
            forms["m"]["винительный"] = forms["m"]["родительный"]
    
    return forms[gender]


