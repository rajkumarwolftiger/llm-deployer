#!/usr/bin/env python3
"""Round 2: for each repo discovered in a CSV/DB, POST a round=2 task to endpoint."""
# This is a skeleton; adapt to your repos table or CSV
import requests, uuid, time


def build_round2(original_task):
    return {
'email': original_task['email'],
'secret': original_task['secret'],
'task': original_task['task'],
'round': 2,
'nonce': str(uuid.uuid4()),
'brief': original_task.get('brief','Add a new feature for round 2'),
'checks': ['README.md updated'],
'evaluation_url': original_task.get('evaluation_url')
}


# implement reading from DB or CSV of repos table