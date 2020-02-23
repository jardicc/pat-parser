# Should I use this in production?
Not yet. There is still work in progress. I will probably change and break some things. Make your own copy if you want to.

# PAT Parser
This is parser of Photoshop .pat files. These files contains pattern images. This tool will help you to extract metadata about patterns and also patterns itself as PNG files.

This tools is not able to create .pat file.

It use modern Node.js, TypeScript, and ts-node-dev for development. For test driven developement I used wallaby and tests are written for TS-Jest. So if you have no license for Wallaby just use TS-Jest.

Right now it has no UI or command line interface. If you want to use this you need to include typescript files into your project or generate javascript files and then include them in your project if you project is not using TS.

I do prefer readability and understanding of inner .pat file strucure over high performance code in this project. But it still should be very fast.

# Supported input pattern items for file export
- __Color modes__: RGB, Indexed colors, Grayscale
- __Compression__: Packbits, None
- __Pixel depth__: 8 bits/channel
- __Transparency__: yes

# Unsupported input pattern items for file export
- __Color modes__: CMYK, Lab
- __Pixel depth__: 16, 32 bits/channel
- pattern organizing hiearchy

# License
MIT.