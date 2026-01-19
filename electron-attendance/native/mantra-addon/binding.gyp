{
  "targets": [
    {
      "target_name": "mantraaddon",
      "sources": ["src/addon.cpp"],
      "include_dirs": [
        "<!(node -p \"require('node-addon-api').include\")",
        "src"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS=0"],
      "cflags_cc": ["-std=c++17"],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": ["/std:c++17"]
        }
      },
      "libraries": [
        "DelayImp.lib"
      ]
    }
  ]
}
