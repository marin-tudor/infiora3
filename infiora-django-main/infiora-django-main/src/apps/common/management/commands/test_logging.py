"""
Management command to test the logging system
Usage: python manage.py test_logging
"""
from django.core.management.base import BaseCommand
from apps.common.logging import (
    get_logger, auth_logger, api_logger, security_logger, performance_logger
)


class Command(BaseCommand):
    help = 'Test the logging system with sample messages'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--level',
            type=str,
            default='all',
            help='Log level to test (debug, info, warning, error, critical, all)'
        )
        parser.add_argument(
            '--logger',
            type=str,
            default='all',
            help='Logger to test (auth, api, security, performance, all)'
        )
    
    def handle(self, *args, **options):
        level = options['level'].lower()
        logger_type = options['logger'].lower()
        
        self.stdout.write(
            self.style.SUCCESS('Testing logging system...')
        )
        
        # Test different loggers
        loggers_to_test = {
            'auth': auth_logger,
            'api': api_logger,
            'security': security_logger,
            'performance': performance_logger,
        }
        
        if logger_type == 'all':
            test_loggers = loggers_to_test
        elif logger_type in loggers_to_test:
            test_loggers = {logger_type: loggers_to_test[logger_type]}
        else:
            self.stdout.write(
                self.style.ERROR(f'Unknown logger: {logger_type}')
            )
            return
        
        # Test different log levels
        levels_to_test = ['debug', 'info', 'warning', 'error', 'critical']
        if level != 'all' and level in levels_to_test:
            levels_to_test = [level]
        elif level != 'all':
            self.stdout.write(
                self.style.ERROR(f'Unknown level: {level}')
            )
            return
        
        for logger_name, logger in test_loggers.items():
            self.stdout.write(f'Testing {logger_name} logger...')
            
            for log_level in levels_to_test:
                message = f"Test {log_level} message from {logger_name} logger"
                
                if log_level == 'debug':
                    logger.debug(message, test_param='debug_value')
                elif log_level == 'info':
                    logger.info(message, test_param='info_value')
                elif log_level == 'warning':
                    logger.warning(message, test_param='warning_value')
                elif log_level == 'error':
                    logger.error(message, test_param='error_value')
                elif log_level == 'critical':
                    logger.critical(message, test_param='critical_value')
            
            # Test specific logger methods
            if logger_name == 'auth':
                logger.user_action('test-user-123', 'test_action', ip='127.0.0.1')
                
            elif logger_name == 'api':
                logger.api_call('GET', '/api/test', 200, 0.1)
                
            elif logger_name == 'security':
                logger.security_event('test_security_event', severity='high')
                
            elif logger_name == 'performance':
                logger.performance_metric('test_metric', 123.45, 'ms')
        
        # Test structured data
        app_logger = get_logger('apps.test')
        app_logger.info(
            "Test structured logging",
            user_id='user-123',
            action='test_command',
            metadata={
                'test_dict': {'nested': 'value'},
                'test_list': [1, 2, 3],
                'test_bool': True,
            }
        )
        
        self.stdout.write(
            self.style.SUCCESS('Logging test completed! Check log files in logs/ directory.')
        )