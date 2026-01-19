const edge = require("edge-js");
const path = require("path");

const dllPath = path.join(__dirname, "sdk");

const captureFunc = edge.func({
  source: `
    using System;
    using System.IO;
    using System.Runtime.InteropServices;
    using System.Threading.Tasks;

    public class Startup
    {
        // ✅ Load DLLs (must be in same folder as exe OR copied to output)
        [DllImport("MFS100Dll.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int Init();

        [DllImport("MFS100Dll.dll", CallingConvention = CallingConvention.StdCall)]
        public static extern int CaptureFinger(int quality, int timeout, byte[] template);

        public async Task<object> Invoke(dynamic input)
        {
            try
            {
                int initResult = Init();
                if (initResult != 0)
                {
                    return new { success = false, error = "Init failed: " + initResult };
                }

                byte[] templateBuf = new byte[5120];

                int captureResult = CaptureFinger(70, 5000, templateBuf);
                if (captureResult != 0)
                {
                    return new { success = false, error = "Capture failed: " + captureResult };
                }

                string templateBase64 = Convert.ToBase64String(templateBuf);

                return new {
                    success = true,
                    template = templateBase64,
                    quality = 70
                };
            }
            catch(Exception ex)
            {
                return new { success = false, error = ex.Message };
            }
        }
    }
  `,
  references: [],
});

module.exports = async function capture() {
  return new Promise((resolve, reject) => {
    captureFunc(null, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
  });
};
