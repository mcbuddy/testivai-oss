*** Settings ***
Library    SeleniumLibrary
Resource   ../testivai_keywords.robot

*** Variables ***
${URL}    http://localhost:3000

*** Test Cases ***
Homepage Visual Test
    Open Browser    ${URL}    chrome    options=add_argument("--remote-debugging-port=9222")
    Witness    homepage
    Close Browser
