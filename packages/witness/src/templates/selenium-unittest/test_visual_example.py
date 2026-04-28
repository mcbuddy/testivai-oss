# TestivAI Visual Regression Example
# Docs: https://testiv.ai/docs#python
import unittest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from testivai_witness import witness


class VisualTest(unittest.TestCase):
    def setUp(self):
        options = Options()
        options.add_argument('--remote-debugging-port=9222')
        self.driver = webdriver.Chrome(options=options)

    def tearDown(self):
        self.driver.quit()

    def test_homepage(self):
        self.driver.get('http://localhost:3000')
        witness(self.driver, 'homepage')


if __name__ == '__main__':
    unittest.main()
