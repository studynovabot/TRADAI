#!/usr/bin/env python3
"""
🔧 Gemini API Key Health Checker with Failover Testing
=====================================================

This script tests multiple Google Gemini API keys for health, quota, and response quality.
Provides comprehensive reporting and failover capabilities for production AI pipelines.

Features:
- Sequential testing of multiple API keys
- Response validation and quality assessment
- Detailed JSON and table-style reporting
- Timeout and error handling
- Production-ready failover logic
- Response time monitoring

Author: AI Coder Assistant
Date: 2025-07-30
"""

import json
import time
import logging
import requests
import argparse
from typing import List, Dict, Any, Optional
from datetime import datetime
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('gemini_api_health.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class GeminiAPIHealthChecker:
    """
    Comprehensive health checker for Google Gemini API keys
    """
    
    def __init__(self, timeout: int = 30, wait_between_calls: float = 1.0):
        """
        Initialize the health checker
        
        Args:
            timeout: Request timeout in seconds
            wait_between_calls: Wait time between API calls to avoid rate limits
        """
        self.timeout = timeout
        self.wait_between_calls = wait_between_calls
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent"
        self.test_prompt = "Summarize this sentence: The stock market is volatile today due to inflation data."
        
        # Test results storage
        self.results = []
        self.working_keys = []
        
    def test_api_key(self, api_key: str) -> Dict[str, Any]:
        """
        Test a single API key for functionality and response quality
        
        Args:
            api_key: The Gemini API key to test
            
        Returns:
            Dictionary containing test results
        """
        logger.info(f"Testing API key: {api_key[:20]}...")
        
        start_time = time.time()
        result = {
            "api_key": api_key,
            "status": "unknown",
            "response_time": None,
            "error": None,
            "output_sample": None,
            "response_length": 0,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # Prepare request payload
            payload = {
                "contents": [{
                    "parts": [{
                        "text": self.test_prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 100
                }
            }
            
            headers = {
                "Content-Type": "application/json"
            }
            
            # Make API request
            url = f"{self.base_url}?key={api_key}"
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=self.timeout
            )
            
            # Calculate response time
            response_time = round((time.time() - start_time) * 1000, 2)
            result["response_time"] = f"{response_time}ms"
            
            # Check response status
            if response.status_code == 200:
                response_data = response.json()
                
                # Extract generated content
                if "candidates" in response_data and len(response_data["candidates"]) > 0:
                    content = response_data["candidates"][0]["content"]["parts"][0]["text"]
                    result["output_sample"] = content[:100] + "..." if len(content) > 100 else content
                    result["response_length"] = len(content)
                    result["status"] = "working"
                    
                    # Validate response quality
                    if self._validate_response_quality(content):
                        logger.info(f"✅ API key working - Response time: {response_time}ms")
                        self.working_keys.append(api_key)
                    else:
                        result["status"] = "poor_quality"
                        result["error"] = "Response quality below threshold"
                        logger.warning(f"⚠️ API key working but poor quality response")
                else:
                    result["status"] = "error"
                    result["error"] = "No content in response"
                    logger.error(f"❌ API key failed - No content in response")
                    
            elif response.status_code == 429:
                result["status"] = "quota_exceeded"
                result["error"] = "Quota exceeded or rate limited"
                logger.error(f"❌ API key failed - Quota exceeded")
                
            elif response.status_code == 403:
                result["status"] = "invalid_key"
                result["error"] = "Invalid API key or access denied"
                logger.error(f"❌ API key failed - Invalid or access denied")
                
            else:
                result["status"] = "error"
                result["error"] = f"HTTP {response.status_code}: {response.text[:200]}"
                logger.error(f"❌ API key failed - HTTP {response.status_code}")
                
        except requests.exceptions.Timeout:
            result["status"] = "timeout"
            result["error"] = f"Request timeout after {self.timeout} seconds"
            logger.error(f"❌ API key failed - Timeout")
            
        except requests.exceptions.RequestException as e:
            result["status"] = "network_error"
            result["error"] = f"Network error: {str(e)}"
            logger.error(f"❌ API key failed - Network error: {e}")
            
        except Exception as e:
            result["status"] = "unexpected_error"
            result["error"] = f"Unexpected error: {str(e)}"
            logger.error(f"❌ API key failed - Unexpected error: {e}")
            
        return result
    
    def _validate_response_quality(self, content: str) -> bool:
        """
        Validate the quality of the API response
        
        Args:
            content: The generated content to validate
            
        Returns:
            True if response quality is acceptable
        """
        if not content or len(content.strip()) < 10:
            return False
            
        # Check for common quality indicators
        quality_indicators = [
            "stock market" in content.lower(),
            "volatile" in content.lower() or "volatility" in content.lower(),
            "inflation" in content.lower(),
            len(content.split()) >= 5  # At least 5 words
        ]
        
        return sum(quality_indicators) >= 2
    
    def test_all_keys(self, api_keys: List[str]) -> List[Dict[str, Any]]:
        """
        Test all provided API keys sequentially
        
        Args:
            api_keys: List of API keys to test
            
        Returns:
            List of test results for all keys
        """
        logger.info(f"🚀 Starting health check for {len(api_keys)} API keys...")
        
        for i, api_key in enumerate(api_keys, 1):
            logger.info(f"Testing key {i}/{len(api_keys)}")
            
            result = self.test_api_key(api_key)
            self.results.append(result)
            
            # Wait between calls to avoid rate limiting
            if i < len(api_keys):
                time.sleep(self.wait_between_calls)
        
        logger.info(f"✅ Health check completed. {len(self.working_keys)} working keys found.")
        return self.results
    
    def get_working_key(self) -> Optional[str]:
        """
        Get the first working API key
        
        Returns:
            First working API key or None if no keys work
        """
        return self.working_keys[0] if self.working_keys else None
    
    def generate_report(self, output_file: str = None) -> Dict[str, Any]:
        """
        Generate comprehensive health check report
        
        Args:
            output_file: Optional file path to save JSON report
            
        Returns:
            Complete report dictionary
        """
        working_count = len(self.working_keys)
        total_count = len(self.results)
        
        report = {
            "summary": {
                "total_keys_tested": total_count,
                "working_keys": working_count,
                "success_rate": f"{(working_count/total_count*100):.1f}%" if total_count > 0 else "0%",
                "test_timestamp": datetime.now().isoformat(),
                "recommended_key": self.get_working_key()
            },
            "detailed_results": self.results,
            "working_keys_order": self.working_keys
        }
        
        # Save to file if specified
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(report, f, indent=2)
            logger.info(f"📄 Report saved to {output_file}")
        
        return report
    
    def print_summary_table(self):
        """
        Print a formatted summary table to console
        """
        print("\n" + "="*80)
        print("🔧 GEMINI API KEY HEALTH CHECK SUMMARY")
        print("="*80)
        
        for i, result in enumerate(self.results, 1):
            status_emoji = {
                "working": "✅",
                "error": "❌", 
                "quota_exceeded": "⚠️",
                "invalid_key": "🚫",
                "timeout": "⏰",
                "network_error": "🌐",
                "poor_quality": "⚠️"
            }.get(result["status"], "❓")
            
            key_display = result["api_key"][:20] + "..." if len(result["api_key"]) > 20 else result["api_key"]
            
            print(f"{i:2d}. {status_emoji} {key_display}")
            print(f"    Status: {result['status'].replace('_', ' ').title()}")
            
            if result["response_time"]:
                print(f"    Response Time: {result['response_time']}")
            
            if result["error"]:
                print(f"    Error: {result['error']}")
            elif result["output_sample"]:
                print(f"    Sample: {result['output_sample']}")
            
            print()
        
        working_count = len(self.working_keys)
        total_count = len(self.results)
        success_rate = (working_count/total_count*100) if total_count > 0 else 0
        
        print(f"📊 RESULTS: {working_count}/{total_count} keys working ({success_rate:.1f}% success rate)")
        
        if self.working_keys:
            print(f"🎯 RECOMMENDED KEY: {self.working_keys[0][:20]}...")
        else:
            print("⚠️  NO WORKING KEYS FOUND")
        
        print("="*80)


def main():
    """
    Main function to run the API health checker
    """
    # API keys to test
    api_keys = [
        "AIzaSyBr9_N7QNQfxNI1JIEjd-l0qnyN61IfulE",
        "AIzaSyDvTH98GEAebeff7iUx7NQuIYK68dqz4Ek", 
        "AIzaSyD1pTVJno5wtscsglp4jCLA9r3aodByPa8",
        "AIzaSyBusUTYXjsgXYrNMMQinAVsrrIiaJZfTtA",
        "AIzaSyCgSvIzxbRWwIlae90z1-SlcS15npl33gU"
    ]
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Gemini API Key Health Checker")
    parser.add_argument("--timeout", type=int, default=30, help="Request timeout in seconds")
    parser.add_argument("--wait", type=float, default=1.0, help="Wait time between API calls")
    parser.add_argument("--output", type=str, help="Output file for JSON report")
    parser.add_argument("--test-mode", action="store_true", help="Enable test mode")
    
    args = parser.parse_args()
    
    # Initialize health checker
    checker = GeminiAPIHealthChecker(
        timeout=args.timeout,
        wait_between_calls=args.wait
    )
    
    try:
        # Run health check
        results = checker.test_all_keys(api_keys)
        
        # Generate and display report
        report = checker.generate_report(args.output)
        checker.print_summary_table()
        
        # Return appropriate exit code
        working_keys = len(checker.working_keys)
        if working_keys == 0:
            logger.error("❌ No working API keys found!")
            sys.exit(1)
        elif working_keys < len(api_keys) // 2:
            logger.warning("⚠️ Less than half of the API keys are working")
            sys.exit(2)
        else:
            logger.info("✅ Health check completed successfully")
            sys.exit(0)
            
    except KeyboardInterrupt:
        logger.info("🛑 Health check interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"💥 Unexpected error during health check: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
