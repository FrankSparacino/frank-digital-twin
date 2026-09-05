import pandas as pd
import requests
import json

df = pd.read_excel('Frank Sparacino Six Sigma Project List.xlsx', sheet_name='Sheet1')
total_projects = len(df)
total_hard = df['Hard'].sum()
total_soft = df['Soft'].sum()

summary_content = (
    f'Frank Sparacino has an extensive Six Sigma portfolio consisting of {total_projects} projects '
    f'primarily serving in Black Belt (BB) and Master Black Belt mentoring roles. '
    f'He has driven massive financial impact, including over \ in hard savings '
    f'and \ in soft savings across complex capital infrastructure and engineering programs '
    f'such as APLNG (Australia Pacific LNG) and major project controls initiatives.'
)

payload = {
    'id': 'six-sigma-portfolio-summary',
    'title': 'Six Sigma Project Portfolio & Financial Impact Summary',
    'category': 'credentials',
    'content': summary_content
}

url = 'https://frank-digital-twin.frank-digital-twin.workers.dev/api/ingest'
headers = {'Content-Type': 'application/json'}
response = requests.post(url, data=json.dumps(payload), headers=headers)
print('Ingest response:', response.json())
