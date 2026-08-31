// Stamps build/icon.ico onto the Windows .exe after electron-builder packs.
// signAndEditExecutable stays false: enabling it pulls winCodeSign, which
// fails to extract darwin symlinks on Windows without admin privileges.
// rcedit is applied to a temp copy because the freshly packed exe is often
// still locked ("Unable to commit changes") if edited in place.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

/** @param {import('app-builder-lib').AfterPackContext} context */
module.exports = async function afterPackWinIcon(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exe = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.exe`,
  );
  const ico = path.join(context.packager.projectDir, 'build', 'icon.ico');
  const rcedit = path.join(
    context.packager.projectDir,
    'node_modules',
    'rcedit',
    'bin',
    process.arch === 'ia32' ? 'rcedit.exe' : 'rcedit-x64.exe',
  );

  if (!fs.existsSync(exe)) {
    throw new Error(`[after-pack-win-icon] exe not found: ${exe}`);
  }
  if (!fs.existsSync(ico)) {
    throw new Error(`[after-pack-win-icon] icon not found: ${ico}`);
  }
  if (!fs.existsSync(rcedit)) {
    throw new Error(`[after-pack-win-icon] rcedit not found: ${rcedit}`);
  }

  const tmp = path.join(os.tmpdir(), `gaia-exe-icon-${Date.now()}.exe`);
  fs.copyFileSync(exe, tmp);
  try {
    execFileSync(rcedit, [tmp, '--set-icon', ico], { stdio: 'inherit' });
    fs.copyFileSync(tmp, exe);
  } finally {
    fs.unlinkSync(tmp);
  }
  console.log(`[after-pack-win-icon] set icon ${ico} on ${exe}`);
};
