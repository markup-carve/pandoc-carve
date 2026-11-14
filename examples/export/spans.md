# Table spans

Carve tables carry cell spans with two markers: `<` merges a cell into
its left neighbor (colspan) and `^` merges a cell into the one above it
(rowspan). pandoc-carve rewrites these into
Pandoc<span class="carve-smart" kind="right_single_quote"
data-source="'" data-glyph="’">’</span>s origin-cell span model (the
origin cell holds the width/height; covered cells are omitted), so the
merged regions survive into LaTeX `\multicolumn`/`\multirow`, DOCX
merged cells, Typst, and the rest - not just HTML.

<table
data-carve-caption="{&quot;type&quot;:&quot;caption&quot;,&quot;children&quot;:[{&quot;type&quot;:&quot;paragraph&quot;,&quot;children&quot;:[{&quot;type&quot;:&quot;text&quot;,&quot;value&quot;:&quot;Sales by region (North 2024 spans both years; South spans two rows)&quot;}]}]}">
<caption>Sales by region (North 2024 spans both years; South spans two
rows)</caption>
<thead>
<tr>
<th>Region</th>
<th>2024</th>
<th>2025</th>
</tr>
</thead>
<tbody>
<tr
data-carve-covered-cells="[{&quot;index&quot;:2,&quot;cell&quot;:{&quot;type&quot;:&quot;table_cell&quot;,&quot;header&quot;:false,&quot;span&quot;:&quot;colspan&quot;,&quot;children&quot;:[]}}]">
<td>North</td>
<td colspan="2">100</td>
</tr>
<tr>
<td rowspan="2">South</td>
<td>40</td>
<td>60</td>
</tr>
<tr
data-carve-covered-cells="[{&quot;index&quot;:0,&quot;cell&quot;:{&quot;type&quot;:&quot;table_cell&quot;,&quot;header&quot;:false,&quot;span&quot;:&quot;rowspan&quot;,&quot;children&quot;:[]}}]">
<td>30</td>
<td>50</td>
</tr>
</tbody>
</table>
