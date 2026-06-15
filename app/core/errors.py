class TemplateEngineError(Exception):
    """Base exception for the PDF engine."""


class TemplateNotFoundError(TemplateEngineError):
    """Raised when a template bundle cannot be found."""


class TemplateValidationError(TemplateEngineError):
    """Raised when incoming render data is invalid."""


class TemplateSecurityError(TemplateEngineError):
    """Raised when a template performs a forbidden operation."""


class PdfGenerationError(TemplateEngineError):
    """Raised when HTML cannot be converted to PDF."""
