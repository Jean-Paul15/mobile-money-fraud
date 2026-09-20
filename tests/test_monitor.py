"""Tests — Monitoring PSI (src/evaluation/monitor.py)."""
import sys
from pathlib import Path
import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.evaluation.monitor import compute_psi


class TestComputePsi:
    def test_identical_distributions_near_zero(self):
        """PSI = 0 quand la distribution courante est identique a la reference."""
        rng = np.random.default_rng(42)
        # Creer deux ensembles de scores venant de la meme distribution
        ref_scores = rng.beta(0.5, 5, 5000)
        ref_hist, _ = np.histogram(ref_scores, bins=10, range=(0, 1))
        actual_scores = rng.beta(0.5, 5, 5000)
        psi = compute_psi(actual_scores, ref_hist=ref_hist, bins=10)
        # PSI doit etre tres faible (< 0.1 = stable)
        assert psi < 0.10, f"PSI={psi:.4f} trop eleve pour distributions identiques"

    def test_different_distributions_high_psi(self):
        """PSI eleve quand la distribution a derive significativement."""
        rng = np.random.default_rng(0)
        # Reference : scores concentres vers 0 (peu de fraudes)
        ref_scores = rng.beta(0.3, 10, 5000)
        ref_hist, _ = np.histogram(ref_scores, bins=10, range=(0, 1))
        # Actuel : scores concentres vers 1 (beaucoup de fraudes — derive)
        drifted_scores = rng.beta(5, 0.5, 5000)
        psi = compute_psi(drifted_scores, ref_hist=ref_hist, bins=10)
        assert psi > 0.20, f"PSI={psi:.4f} devrait detecter la derive"

    def test_returns_float(self):
        scores = np.random.rand(200)
        psi = compute_psi(scores)
        assert isinstance(psi, float)

    def test_non_negative(self):
        """PSI est toujours >= 0."""
        rng = np.random.default_rng(7)
        for _ in range(10):
            scores = rng.random(300)
            psi = compute_psi(scores)
            assert psi >= 0.0

    def test_fallback_without_ref_hist(self):
        """Sans ref_hist, compare a uniforme — doit retourner un float valide."""
        scores = np.random.beta(2, 5, 1000)
        psi = compute_psi(scores, ref_hist=None)
        assert isinstance(psi, float)
        assert psi >= 0.0

    def test_psi_thresholds(self):
        """Verifier les seuils PSI standard : < 0.1 stable, 0.1-0.2 attention, > 0.2 derive."""
        rng = np.random.default_rng(99)
        base = rng.beta(1, 5, 10_000)
        ref_hist, _ = np.histogram(base, bins=10, range=(0, 1))

        # Meme distribution = stable
        stable = rng.beta(1, 5, 10_000)
        psi_stable = compute_psi(stable, ref_hist=ref_hist)
        assert psi_stable < 0.10

        # Distribution tres differente = derive
        drifted = rng.beta(5, 1, 10_000)
        psi_drifted = compute_psi(drifted, ref_hist=ref_hist)
        assert psi_drifted > 0.20

    def test_bins_parameter(self):
        """Doit fonctionner avec differents nombres de bins."""
        scores = np.random.rand(500)
        for bins in [5, 10, 20]:
            psi = compute_psi(scores, bins=bins)
            assert isinstance(psi, float)
            assert psi >= 0.0
