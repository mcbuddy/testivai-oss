# TestivAI Visual Regression Example
# Docs: https://testiv.ai/docs#python
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from testivai_witness import witness


@pytest.fixture
def driver():
    options = Options()
    options.add_argument('--remote-debugging-port=9222')
    drv = webdriver.Chrome(options=options)
    yield drv
    drv.quit()


def test_homepage(driver):
    driver.get('http://localhost:3000')
    witness(driver, 'homepage')
