Scripts para regenerar public/arancel.json desde el PDF oficial del Arancel Centroamericano.

1. pdftotext -layout ARANCEL.pdf data-src/aci.txt
2. python3 scripts/parse_aci.py data-src/aci.txt data-src/raw.json
3. python3 scripts/parse_geo.py ARANCEL.pdf data-src/geo.json
4. python3 scripts/build_data.py
