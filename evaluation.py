#!/usr/bin/env python3
"""Skeleton evaluator: fetches repo, checks license and README, and records results."""
import requests, os, subprocess, tempfile, json


# Implement: clone repo@commit, check L