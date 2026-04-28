*** Settings ***
Library    SeleniumLibrary
Library    testivai_witness.py

*** Keywords ***
Witness
    [Arguments]    ${name}
    Execute Javascript    return window.testivaiWitness('${name}')
