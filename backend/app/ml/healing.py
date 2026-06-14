"""
Genetic Algorithm-based self-healing rule generation.
"""
import random
import re
import string
from datetime import datetime
from typing import Optional

PATTERN_TOKENS = {
    "SQL Injection": [
        r"(?i)(union\s+select)",
        r"(?i)(drop\s+table)",
        r"(?i)(insert\s+into)",
        r"(?i)(or\s+1\s*=\s*1)",
        r"(?i)(sleep\(\d+\))",
        r"(?i)(exec\s*\(|xp_cmdshell)",
        r"(?i)('\s+or\s+')",
    ],
    "XSS": [
        r"(?i)(<script[^>]*>)",
        r"(?i)(javascript\s*:)",
        r"(?i)(onerror\s*=)",
        r"(?i)(onload\s*=)",
        r"(?i)(alert\s*\()",
        r"(?i)(document\.cookie)",
    ],
    "Command Injection": [
        r"[;&|`]\s*(ls|cat|id|whoami)",
        r"(\$\(|\`)",
        r"(?i)(/bin/sh|/bin/bash|cmd\.exe)",
    ],
    "Path Traversal": [
        r"(\.\./){2,}",
        r"(%2e%2e%2f)+",
        r"(etc/passwd|etc/shadow)",
    ],
}

def fitness(pattern: str, positives: list[str], negatives: list[str]) -> float:
    tp = sum(1 for s in positives if re.search(pattern, s))
    fp = sum(1 for s in negatives if re.search(pattern, s))
    fn = len(positives) - tp

    precision = tp / (tp + fp + 1e-9)
    recall    = tp / (tp + fn + 1e-9)
    f1        = 2 * precision * recall / (precision + recall + 1e-9)
    return f1

def crossover(p1: str, p2: str) -> str:
    parts1 = p1.split("|")
    parts2 = p2.split("|")
    mid    = max(1, len(parts1) // 2)
    child  = parts1[:mid] + parts2[mid:]
    return "|".join(dict.fromkeys(child))

def mutate(pattern: str, attack_type: str) -> str:
    tokens   = PATTERN_TOKENS.get(attack_type, [])
    mutation = random.choice(["add", "remove", "modify"])

    if mutation == "add" and tokens:
        extra = random.choice(tokens)
        return f"({pattern})|{extra}"
    elif mutation == "remove" and "|" in pattern:
        parts = pattern.split("|")
        parts.pop(random.randrange(len(parts)))
        return "|".join(parts) if parts else pattern
    else:
        return pattern.replace(")", ")", 1)

def genetic_rule_generation(
    attack_type: str,
    evasion_payload: str,
    n_generations: int = 50,
    population_size: int = 20,
) -> dict:
    base_tokens  = PATTERN_TOKENS.get(attack_type, [r"(?i)(attack)"])
    negatives    = ["hello world", "select count(*) from items limit 10", "normal request body", "<div>ok</div>"]
    positives    = [evasion_payload] + [
        f"bypass_{i}_{evasion_payload[:10]}" for i in range(5)
    ]

    population = random.choices(base_tokens, k=min(population_size, len(base_tokens)))
    if len(population) < population_size:
        extras = [crossover(random.choice(base_tokens), random.choice(base_tokens)) for _ in range(population_size - len(population))]
        population.extend(extras)

    best = population[0]
    best_fitness = 0.0

    for gen in range(n_generations):
        scored = [(p, fitness(p, positives, negatives)) for p in population]
        scored.sort(key=lambda x: x[1], reverse=True)

        if scored[0][1] > best_fitness:
            best, best_fitness = scored[0]

        elite      = [p for p, _ in scored[:4]]
        offspring  = []
        while len(offspring) < population_size - len(elite):
            p1, p2 = random.choices(elite, k=2)
            child  = crossover(p1, p2)
            if random.random() < 0.3:
                child = mutate(child, attack_type)
            offspring.append(child)

        population = elite + offspring

    final_fp   = sum(1 for n in negatives if re.search(best, n))
    fp_rate    = final_fp / max(len(negatives), 1)
    tp         = sum(1 for p in positives if re.search(best, p))
    accuracy   = tp / max(len(positives), 1)

    return {
        "pattern":     best,
        "attack_type": attack_type,
        "accuracy":    round(accuracy * 100, 2),
        "fp_rate":     round(fp_rate * 100, 2),
        "generations": n_generations,
        "name":        f"AUTO_HEAL_{abs(hash(best)) % 99999:05d}",
        "deployed_at": datetime.utcnow(),
    }
