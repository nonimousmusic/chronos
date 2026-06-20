"""
Focal loss callable classes for XGBoost.
Defined at module level so pickle can find them from any caller.
"""

import numpy as np


class FocalLossObjective:
    """Pickleable callable for XGBoost focal loss custom objective."""
    def __init__(self, alpha=0.35, gamma=2.5):
        self.alpha = alpha
        self.gamma = gamma

    def __call__(self, y_true, y_pred):
        p = 1.0 / (1.0 + np.exp(-y_pred))
        p = np.clip(p, 1e-7, 1.0 - 1e-7)
        pt = np.where(y_true == 1, p, 1 - p)
        alpha_t = np.where(y_true == 1, self.alpha, 1 - self.alpha)
        grad = alpha_t * (
            self.gamma * (1 - pt) ** (self.gamma - 1) * np.log(pt + 1e-9) * pt * (1 - pt)
            + (1 - pt) ** self.gamma * (y_true - p)
        ) * (-1)
        hess = alpha_t * (1 - pt) ** self.gamma * p * (1 - p)
        hess = np.maximum(hess, 1e-7)
        return grad, hess


class FocalLossEval:
    """Pickleable callable for XGBoost focal loss evaluation metric."""
    __name__ = 'focal_loss'
    def __init__(self, alpha=0.35, gamma=2.5):
        self.alpha = alpha
        self.gamma = gamma

    def __call__(self, y_true, y_pred):
        p = 1.0 / (1.0 + np.exp(-np.clip(y_pred, -10, 10)))
        p = np.clip(p, 1e-7, 1.0 - 1e-7)
        pt = np.where(y_true == 1, p, 1 - p)
        alpha_t = np.where(y_true == 1, self.alpha, 1 - self.alpha)
        fl = -alpha_t * (1 - pt) ** self.gamma * np.log(pt)
        return np.mean(fl)
