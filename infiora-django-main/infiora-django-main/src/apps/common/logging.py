"""
Advanced logging utilities and formatters for Infiora backend
Provides structured logging with JSON formatting, request tracking, and performance monitoring
"""
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from django.conf import settings
from django.utils import timezone
from django.http import HttpRequest
from threading import local


# Thread-local storage for request context
_request_context = local()


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        
        # Add process and thread info
        if hasattr(record, 'process') and record.process:
            log_data['process_id'] = record.process
        if hasattr(record, 'thread') and record.thread:
            log_data['thread_id'] = record.thread
            
        # Add request context if available
        request_context = getattr(_request_context, 'data', None)
        if request_context:
            log_data['request'] = request_context
            
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'traceback': self.formatException(record.exc_info)
            }
            
        # Add any extra fields passed to the logger
        extra_fields = {
            key: value for key, value in record.__dict__.items()
            if key not in {
                'name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
                'filename', 'module', 'lineno', 'funcName', 'created',
                'msecs', 'relativeCreated', 'thread', 'threadName',
                'processName', 'process', 'getMessage', 'exc_info',
                'exc_text', 'stack_info'
            }
        }
        
        if extra_fields:
            log_data['extra'] = extra_fields
            
        return json.dumps(log_data, default=str, ensure_ascii=False)


class ColoredFormatter(logging.Formatter):
    """Colored formatter for console output"""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with colors"""
        # Add color to level name
        level_color = self.COLORS.get(record.levelname, '')
        record.levelname = f"{level_color}{record.levelname}{self.RESET}"
        
        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime('%H:%M:%S')
        
        # Create formatted message
        formatted = f"[{timestamp}] {record.levelname} {record.name}: {record.getMessage()}"
        
        # Add request context if available
        request_context = getattr(_request_context, 'data', None)
        if request_context:
            request_id = request_context.get('id', 'unknown')
            formatted = f"[{request_id}] {formatted}"
            
        return formatted


class RequestContextManager:
    """Manages request context for logging"""
    
    @staticmethod
    def set_request_context(request: HttpRequest) -> str:
        """Set request context for current thread"""
        request_id = str(uuid.uuid4())[:8]
        
        context = {
            'id': request_id,
            'method': request.method,
            'path': request.path,
            'user': str(request.user) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous',
            'ip': get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', 'unknown')[:100],
        }
        
        _request_context.data = context
        return request_id
    
    @staticmethod
    def clear_request_context():
        """Clear request context for current thread"""
        if hasattr(_request_context, 'data'):
            del _request_context.data
    
    @staticmethod
    def get_request_context() -> Optional[Dict[str, Any]]:
        """Get current request context"""
        return getattr(_request_context, 'data', None)


def get_client_ip(request: HttpRequest) -> str:
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', 'unknown')
    return ip


class StructuredLogger:
    """Enhanced logger with structured logging capabilities"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
    
    def _log(self, level: int, message: str, **kwargs):
        """Internal log method with structured data"""
        # Add common context
        kwargs.setdefault('service', 'infiora-backend')
        kwargs.setdefault('environment', getattr(settings, 'DJANGO_ENVIRONMENT', 'unknown'))
        
        self.logger.log(level, message, extra=kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug message"""
        self._log(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message"""
        self._log(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message"""
        self._log(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message"""
        self._log(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message"""
        self._log(logging.CRITICAL, message, **kwargs)
    
    def api_call(self, method: str, endpoint: str, status_code: int, duration: float, **kwargs):
        """Log API call"""
        self.info(
            f"API {method} {endpoint} - {status_code}",
            method=method,
            endpoint=endpoint,
            status_code=status_code,
            duration_ms=round(duration * 1000, 2),
            **kwargs
        )
    
    def database_query(self, query: str, duration: float, **kwargs):
        """Log database query"""
        self.debug(
            "Database query executed",
            query=query[:200] + '...' if len(query) > 200 else query,
            duration_ms=round(duration * 1000, 2),
            **kwargs
        )
    
    def user_action(self, user_id: str, action: str, **kwargs):
        """Log user action"""
        self.info(
            f"User action: {action}",
            user_id=user_id,
            action=action,
            **kwargs
        )
    
    def security_event(self, event_type: str, **kwargs):
        """Log security event"""
        self.warning(
            f"Security event: {event_type}",
            event_type=event_type,
            **kwargs
        )
    
    def performance_metric(self, metric_name: str, value: float, unit: str = 'ms', **kwargs):
        """Log performance metric"""
        self.info(
            f"Performance metric: {metric_name}",
            metric_name=metric_name,
            value=value,
            unit=unit,
            **kwargs
        )


class TimingContext:
    """Context manager for timing operations"""
    
    def __init__(self, logger: StructuredLogger, operation: str, **kwargs):
        self.logger = logger
        self.operation = operation
        self.kwargs = kwargs
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = time.time() - self.start_time
            if exc_type:
                self.logger.error(
                    f"Operation failed: {self.operation}",
                    operation=self.operation,
                    duration_ms=round(duration * 1000, 2),
                    error=str(exc_val),
                    **self.kwargs
                )
            else:
                self.logger.info(
                    f"Operation completed: {self.operation}",
                    operation=self.operation,
                    duration_ms=round(duration * 1000, 2),
                    **self.kwargs
                )


def get_logger(name: str) -> StructuredLogger:
    """Get structured logger instance"""
    return StructuredLogger(name)


# Common logger instances
app_logger = get_logger('apps')
auth_logger = get_logger('apps.authentication')
api_logger = get_logger('apps.api')
security_logger = get_logger('apps.security')
performance_logger = get_logger('apps.performance')