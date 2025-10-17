#!/usr/bin/env python3
"""Simple round1 generator that reads sample_submissions.csv and posts tasks to endpoints."""
import csv, json, os, requests, time, hashlib, uuid


SUBMISSIONS='sample_submissions.csv'


def gen_task_row(row):
# generate task id from brief hash
    brief = row.get('brief','generic-brief')
    seed = hashlib.sha1((brief + row.get('email','')).encode()).hexdigest()[:6]
    task = f"task-{seed}"
    payload = {
'email': row.get('email'),
'secret': row.get('secret'),
'task': task,
'round': 1,
'nonce': str(uuid.uuid4()),
'brief': brief,
'checks': ['README.md exists'],
'evaluation_url': row.get('evaluation_url'),
'attachments': []
}
    return payload


if __name__ == '__main__':
    with open(SUBMISSIONS) as f:
        reader = csv.DictReader(f)
    for r in reader:
        endpoint = r['endpoint']
        payload = gen_task_row(r)
    try:
        resp = requests.post(endpoint, json=payload, timeout=20)
        print('POST', endpoint, resp.status_code)
    except Exception as e:
        print('ERROR posting to', endpoint, e)
        time.sleep(1)
