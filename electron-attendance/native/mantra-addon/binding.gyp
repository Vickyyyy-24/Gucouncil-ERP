{
  "targets": [
    {
      "target_name": "mantraaddon",
      "sources": ["src/addon.cpp"],
      "include_dirs": [
        "<!(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": ["NAPI_CPP_EXCEPTIONS"],
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1
        }
      },
      "libraries": [
        "Advapi32.lib",
        "User32.lib",
        "Kernel32.lib"
      ]
    }
  ]
}
