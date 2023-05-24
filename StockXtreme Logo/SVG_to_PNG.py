import cairosvg

input_file = 'SXtreme2.svg'
output_file = 'SXtreme2.png'

cairosvg.svg2png(url=input_file, write_to=output_file)
