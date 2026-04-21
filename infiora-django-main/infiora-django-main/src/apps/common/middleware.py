"""
Middleware for Infiora backend
Includes request logging, performance monitoring, and security tracking
"""
import time
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpRequest, HttpResponse
from .logging import RequestContextManager, get_logger, api_logger


class RequestLoggingMiddleware(MiddlewareMixin):
    """Middleware to log all HTTP requests and responses"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request: HttpRequest):
        """Process incoming request"""
        # Set request context for logging
        request_id = RequestContextManager.set_request_context(request)
        request._request_id = request_id
        request._start_time = time.time()
        
        # Only log requests to sensitive endpoints or with issues
        # Skip logging for normal requests
    
    def process_response(self, request: HttpRequest, response: HttpResponse):
        """Process outgoing response"""
        try:
            # Calculate request duration
            duration = time.time() - getattr(request, '_start_time', time.time())
            
            # Only log errors, slow requests, or auth failures
            should_log = False
            
            # Log error responses (4xx, 5xx)
            if response.status_code >= 400:
                should_log = True
                level = 'error' if response.status_code >= 500 else 'warning'
                getattr(api_logger, level)(
                    f"{response.status_code} {request.method} {request.path}",
                    method=request.method,
                    endpoint=request.path,
                    status_code=response.status_code,
                    duration_ms=round(duration * 1000, 2),
                )
            
            # Log slow requests (>2 seconds)
            elif duration > 2.0:
                should_log = True
                api_logger.warning(
                    f"Slow request: {request.method} {request.path}",
                    method=request.method,
                    endpoint=request.path,
                    duration_ms=round(duration * 1000, 2),
                    status_code=response.status_code,
                )
            
            # Log authentication endpoints for security monitoring
            elif request.path.startswith('/api/v1/auth/'):
                should_log = True
                api_logger.info(
                    f"Auth request: {request.method} {request.path}",
                    method=request.method,
                    endpoint=request.path,
                    status_code=response.status_code,
                    duration_ms=round(duration * 1000, 2),
                )
            
        except Exception as e:
            api_logger.error(f"Error in RequestLoggingMiddleware: {str(e)}")
        
        finally:
            # Clear request context
            RequestContextManager.clear_request_context()
        
        return response
    
    def process_exception(self, request: HttpRequest, exception: Exception):
        """Process unhandled exceptions"""
        try:
            duration = time.time() - getattr(request, '_start_time', time.time())
            
            api_logger.error(
                f"Unhandled exception: {request.method} {request.path}",
                method=request.method,
                path=request.path,
                duration_ms=round(duration * 1000, 2),
                exception_type=type(exception).__name__,
                exception_message=str(exception),
                exc_info=True,
            )
        except Exception as e:
            # Fallback logging if our logging fails
            import logging
            logging.getLogger('apps.error').error(f"Error in exception handler: {str(e)}")
        
        finally:
            RequestContextManager.clear_request_context()


class SecurityMiddleware(MiddlewareMixin):
    """Middleware for security event logging"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.security_logger = get_logger('apps.security')
        super().__init__(get_response)
    
    def process_request(self, request: HttpRequest):
        """Check for security-related events"""
        # Log suspicious patterns
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Check for bot/crawler patterns
        bot_patterns = ['bot', 'crawler', 'spider', 'scraper']
        if any(pattern in user_agent.lower() for pattern in bot_patterns):
            self.security_logger.info(
                "Bot/crawler detected",
                user_agent=user_agent,
                path=request.path,
                ip=request.META.get('REMOTE_ADDR'),
            )
        
        # Check for suspicious paths
        suspicious_paths = ['/admin', '/.env', '/config', '/backup']
        if any(request.path.startswith(path) for path in suspicious_paths):
            self.security_logger.warning(
                "Access to sensitive path",
                path=request.path,
                method=request.method,
                ip=request.META.get('REMOTE_ADDR'),
                user_agent=user_agent,
            )
    
    def process_response(self, request: HttpRequest, response: HttpResponse):
        """Check response for security events"""
        # Log failed authentication attempts
        if (request.path.startswith('/api/v1/auth/login') and 
            response.status_code == 400):
            self.security_logger.security_event(
                'failed_login_attempt',
                ip=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
            )
        
        # Log 403 Forbidden responses
        if response.status_code == 403:
            self.security_logger.security_event(
                'forbidden_access',
                path=request.path,
                method=request.method,
                ip=request.META.get('REMOTE_ADDR'),
            )
        
        return response


class PerformanceMiddleware(MiddlewareMixin):
    """Middleware for performance monitoring"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.performance_logger = get_logger('apps.performance')
        super().__init__(get_response)
    
    def process_response(self, request: HttpRequest, response: HttpResponse):
        """Monitor performance metrics"""
        try:
            duration = time.time() - getattr(request, '_start_time', time.time())
            
            # Log performance metrics for different endpoints
            if request.path.startswith('/api/'):
                self.performance_logger.performance_metric(
                    'api_response_time',
                    round(duration * 1000, 2),
                    'ms',
                    endpoint=request.path,
                    method=request.method,
                    status_code=response.status_code,
                )
                
                # Track database queries if available
                from django.db import connection
                query_count = len(connection.queries)
                if query_count > 0:
                    self.performance_logger.performance_metric(
                        'database_query_count',
                        query_count,
                        'queries',
                        endpoint=request.path,
                    )
        
        except Exception as e:
            self.performance_logger.error(f"Error in PerformanceMiddleware: {str(e)}")
        
        return response