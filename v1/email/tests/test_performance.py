"""
Performance and load tests for auto_smtp.py
"""

import pytest
import json
import sys
import time
import psutil
import gc
from pathlib import Path
from unittest.mock import Mock, patch
from memory_profiler import profile
import concurrent.futures

sys.path.insert(0, str(Path(__file__).parent.parent))

import auto_smtp
from tests.fixtures.email_data import generate_large_user_batch
from tests.fixtures.notion_responses import get_paginated_response, get_single_page_response


@pytest.mark.performance
class TestLargeDatasets:
    """Test performance with large datasets"""
    
    @pytest.mark.slow
    def test_large_user_list_processing(self, mocker, temp_files):
        """Test processing 1,000 users"""
        # Setup
        mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--dry-run'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Generate 1,000 users (reduced for faster testing)
        large_user_list = generate_large_user_batch(1000)
        
        # Mock Notion with pagination
        page_size = 100
        responses = []
        for i in range(0, len(large_user_list), page_size):
            responses.append(get_paginated_response(large_user_list, page_size, i // page_size))
        
        mock_notion = Mock()
        mock_notion.databases.query = Mock(side_effect=responses)
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Measure performance
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        
        # Run campaign
        auto_smtp.main()
        
        # Calculate metrics
        end_time = time.time()
        end_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        duration = end_time - start_time
        memory_used = end_memory - start_memory
        
        # Performance assertions
        assert duration < 30  # Should complete within 30 seconds for dry run
        assert memory_used < 200  # Should use less than 200MB
        
        print(f"\nPerformance metrics for 1,000 users:")
        print(f"Duration: {duration:.2f} seconds")
        print(f"Memory used: {memory_used:.2f} MB")
        print(f"Processing rate: {1000/duration:.0f} users/second")
    
    @pytest.mark.slow
    def test_large_sent_emails_filter(self, mocker, temp_files):
        """Test filtering performance with large sent emails list"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--dry-run'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Create large sent emails list (5,000 emails)
        large_sent_list = [f"user{i}@example.com" for i in range(5000)]
        temp_files['sent'].write_text(json.dumps(large_sent_list))
        
        # Create users list with mix of sent and unsent
        test_users = generate_large_user_batch(1000)
        
        # Mock Notion
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(test_users))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Measure filtering performance
        start_time = time.time()
        
        # Run campaign
        auto_smtp.main()
        
        duration = time.time() - start_time
        
        # Should handle large filter list efficiently
        assert duration < 5  # Should complete within 5 seconds
    
    @pytest.mark.slow
    def test_memory_efficiency(self, mocker, temp_files):
        """Test memory efficiency during processing"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--batch-size', '100'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Track memory usage
        memory_samples = []
        
        def track_memory():
            memory_samples.append(psutil.Process().memory_info().rss / 1024 / 1024)
        
        # Generate users
        users = generate_large_user_batch(500)
        
        # Mock Notion
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(users))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Mock other components
        mocker.patch("auto_smtp.compile_mjml_template", return_value="<html>Test</html>")
        
        # Mock SMTP with memory tracking
        original_send = Mock()
        
        def send_with_tracking(msg):
            track_memory()
            return original_send(msg)
        
        mock_smtp = Mock()
        mock_smtp.send_message = send_with_tracking
        mocker.patch("smtplib.SMTP", return_value=mock_smtp)
        mocker.patch("time.sleep", lambda x: None)
        
        # Force garbage collection
        gc.collect()
        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024
        
        # Run campaign
        auto_smtp.main()
        
        # Analyze memory usage
        peak_memory = max(memory_samples) if memory_samples else initial_memory
        memory_growth = peak_memory - initial_memory
        
        # Memory should not grow excessively
        assert memory_growth < 100  # Less than 100MB growth
        
        print(f"\nMemory efficiency metrics:")
        print(f"Initial memory: {initial_memory:.2f} MB")
        print(f"Peak memory: {peak_memory:.2f} MB")
        print(f"Memory growth: {memory_growth:.2f} MB")


@pytest.mark.performance
class TestRateLimiting:
    """Test rate limiting behavior"""
    
    def test_rate_limit_timing(self, mocker, temp_files):
        """Test that rate limiting is enforced"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Use small batch for timing test
        test_users = generate_large_user_batch(5)
        
        # Mock components
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(test_users))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        mocker.patch("auto_smtp.compile_mjml_template", return_value="<html>Test</html>")
        mocker.patch("smtplib.SMTP", return_value=Mock())
        
        # Track sleep calls and disable actual sleeping
        sleep_times = []
        mocker.patch("time.sleep", side_effect=lambda x: sleep_times.append(x))
        
        # Run campaign
        start_time = time.time()
        auto_smtp.main()
        
        # Verify rate limiting
        expected_sleeps = len(test_users) - 1  # No sleep after last email
        assert len(sleep_times) == expected_sleeps
        assert all(t == auto_smtp.CONFIG['RATE_LIMIT_MS'] / 1000 for t in sleep_times)
    
    def test_batch_processing_performance(self, mocker, temp_files):
        """Test batch processing efficiency"""
        batch_sizes = [10, 50, 100, 500]
        results = {}
        
        for batch_size in batch_sizes:
            mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--dry-run', '--batch-size', str(batch_size)])
            mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
            mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
            
            # Disable rate limiting for performance tests
            mocker.patch.dict(auto_smtp.CONFIG, {'RATE_LIMIT_MS': 0})
            
            # Use 50 users for speed
            users = generate_large_user_batch(50)
            
            # Mock components
            mock_notion = Mock()
            mock_notion.databases.query = Mock(return_value=get_single_page_response(users))
            mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
            
            # Measure time
            start_time = time.time()
            auto_smtp.main()
            duration = time.time() - start_time
            
            results[batch_size] = duration
        
        # Larger batches should generally be more efficient
        print(f"\nBatch size performance:")
        for size, duration in results.items():
            print(f"Batch size {size}: {duration:.2f} seconds")


@pytest.mark.performance
class TestConcurrency:
    """Test concurrent operations"""
    
    def test_file_operation_concurrency(self, temp_files):
        """Test concurrent file read/write operations"""
        import threading
        
        # Simulate concurrent reads and writes
        sent_emails = []
        lock = threading.Lock()
        
        def concurrent_update(email):
            # Read current state
            current = auto_smtp.load_json_file(temp_files['sent'])
            
            # Simulate processing time
            time.sleep(0.001)
            
            # Update with lock
            with lock:
                current = auto_smtp.load_json_file(temp_files['sent'])
                current.append(email)
                auto_smtp.save_json_file(temp_files['sent'], current)
        
        # Run concurrent updates
        threads = []
        emails = [f"concurrent{i}@example.com" for i in range(100)]
        
        for email in emails:
            thread = threading.Thread(target=concurrent_update, args=(email,))
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify all emails were saved
        final_emails = auto_smtp.load_json_file(temp_files['sent'])
        assert len(final_emails) == len(emails)
        assert set(final_emails) == set(emails)
    
    @pytest.mark.slow
    def test_notion_api_rate_limits(self, mocker):
        """Test handling of Notion API rate limits"""
        # Track API calls and timing
        api_calls = []
        
        def mock_query(**kwargs):
            api_calls.append(time.time())
            if len(api_calls) > 10:
                # Simulate rate limit after 10 calls
                raise Exception("rate_limited")
            return get_paginated_response([], 100, 0)
        
        mock_notion = Mock()
        mock_notion.databases.query = Mock(side_effect=mock_query)
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Try to fetch users
        with pytest.raises(Exception, match="rate_limited"):
            auto_smtp.fetch_users_from_notion()
        
        # Verify rapid API calls
        assert len(api_calls) > 10
        
        # Check timing between calls
        call_intervals = [api_calls[i+1] - api_calls[i] for i in range(len(api_calls)-1)]
        avg_interval = sum(call_intervals) / len(call_intervals)
        
        print(f"\nAPI call metrics:")
        print(f"Total calls before rate limit: {len(api_calls)}")
        print(f"Average interval between calls: {avg_interval*1000:.2f} ms")


@pytest.mark.performance
class TestResourceUsage:
    """Test system resource usage"""
    
    def test_cpu_usage(self, mocker, temp_files):
        """Monitor CPU usage during processing"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--dry-run'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Generate users
        users = generate_large_user_batch(1000)
        
        # Mock components
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(users))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Monitor CPU
        process = psutil.Process()
        cpu_samples = []
        
        def monitor_cpu():
            while getattr(monitor_cpu, 'running', True):
                cpu_samples.append(process.cpu_percent(interval=0.1))
                time.sleep(0.1)
        
        # Start monitoring in thread
        import threading
        monitor_thread = threading.Thread(target=monitor_cpu)
        monitor_thread.start()
        
        # Run campaign
        auto_smtp.main()
        
        # Stop monitoring
        monitor_cpu.running = False
        monitor_thread.join()
        
        # Analyze CPU usage
        if cpu_samples:
            avg_cpu = sum(cpu_samples) / len(cpu_samples)
            peak_cpu = max(cpu_samples)
            
            print(f"\nCPU usage metrics:")
            print(f"Average CPU: {avg_cpu:.1f}%")
            print(f"Peak CPU: {peak_cpu:.1f}%")
            
            # Should not overwhelm CPU
            assert avg_cpu < 80  # Average below 80%
    
    def test_file_handle_usage(self, mocker, temp_files):
        """Test file handle management"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Track open files
        process = psutil.Process()
        initial_handles = len(process.open_files())
        
        # Generate users with some failures
        users = generate_large_user_batch(100)
        
        # Mock components
        mock_notion = Mock()
        mock_notion.databases.query = Mock(return_value=get_single_page_response(users))
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        mocker.patch("auto_smtp.compile_mjml_template", return_value="<html>Test</html>")
        
        # Mock SMTP with alternating success/failure
        results = [None if i % 2 == 0 else Exception("Test failure") for i in range(len(users))]
        mock_smtp = Mock()
        mock_smtp.send_message = Mock(side_effect=results)
        mocker.patch("smtplib.SMTP", return_value=mock_smtp)
        mocker.patch("time.sleep")
        
        # Run campaign
        auto_smtp.main()
        
        # Check file handles
        final_handles = len(process.open_files())
        
        # Should not leak file handles
        assert final_handles <= initial_handles + 2  # Allow for stdout/stderr


@pytest.mark.performance
class TestScalability:
    """Test scalability limits"""
    
    @pytest.mark.slow
    def test_maximum_practical_limit(self, mocker, temp_files):
        """Test with maximum practical user count"""
        mocker.patch.object(sys, 'argv', ['auto_smtp.py', '--dry-run', '--batch-size', '500'])
        mocker.patch.object(auto_smtp, 'SENT_EMAILS_FILE', temp_files['sent'])
        mocker.patch.object(auto_smtp, 'FAILED_EMAILS_FILE', temp_files['failed'])
        
        # Test with 5,000 users (practical limit for testing)
        user_count = 5000
        users = generate_large_user_batch(user_count)
        
        # Mock Notion with efficient pagination
        page_size = 1000
        current_page = 0
        
        def get_page(**kwargs):
            nonlocal current_page
            start = current_page * page_size
            end = min(start + page_size, len(users))
            
            if start >= len(users):
                return {"results": [], "has_more": False, "next_cursor": None}
            
            page_users = users[start:end]
            response = get_single_page_response(page_users)
            response["has_more"] = end < len(users)
            response["next_cursor"] = f"page-{current_page + 1}" if response["has_more"] else None
            
            current_page += 1
            return response
        
        mock_notion = Mock()
        mock_notion.databases.query = Mock(side_effect=get_page)
        mocker.patch("auto_smtp.NotionClient", return_value=mock_notion)
        
        # Run with timeout
        import signal
        
        def timeout_handler(signum, frame):
            raise TimeoutError("Processing took too long")
        
        # Set 2 minute timeout
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(120)
        
        try:
            start_time = time.time()
            auto_smtp.main()
            duration = time.time() - start_time
            
            print(f"\nScalability test results:")
            print(f"Processed {user_count} users in {duration:.2f} seconds")
            print(f"Rate: {user_count/duration:.0f} users/second")
            
        finally:
            signal.alarm(0)  # Cancel alarm


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "performance"])