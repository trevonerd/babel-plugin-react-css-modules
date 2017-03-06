'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _path = require('path');
var _fs = require('fs');

var _babelPluginSyntaxJsx = require('babel-plugin-syntax-jsx');

var _babelPluginSyntaxJsx2 = _interopRequireDefault(_babelPluginSyntaxJsx);

var _babelTypes = require('babel-types');

var _babelTypes2 = _interopRequireDefault(_babelTypes);

var _createObjectExpression = require('./createObjectExpression');

var _createObjectExpression2 = _interopRequireDefault(_createObjectExpression);

var _requireCssModule = require('./requireCssModule');

var _requireCssModule2 = _interopRequireDefault(_requireCssModule);

var _resolveStringLiteral = require('./resolveStringLiteral');

var _resolveStringLiteral2 = _interopRequireDefault(_resolveStringLiteral);

var _replaceJsxExpressionContainer = require('./replaceJsxExpressionContainer');

var _replaceJsxExpressionContainer2 = _interopRequireDefault(_replaceJsxExpressionContainer);

var _ = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let filesProcessed= [];
let cssImported= [];

exports.default = (_ref) => {
  let t = _ref.types;

  const filenameMap = {};

  const setupFileForRuntimeResolution = (path, filename) => {
    const programPath = path.findParent(parentPath => {
      return parentPath.isProgram();
    });

    filenameMap[filename].importedHelperIndentifier = programPath.scope.generateUidIdentifier('getClassName');
    filenameMap[filename].styleModuleImportMapIdentifier = programPath.scope.generateUidIdentifier('styleModuleImportMap');

    programPath.unshiftContainer('body', t.importDeclaration([t.importDefaultSpecifier(filenameMap[filename].importedHelperIndentifier)], t.stringLiteral('babel-plugin-react-css-modules/dist/browser/getClassName')));

    const firstNonImportDeclarationNode = programPath.get('body').find(node => {
      return !t.isImportDeclaration(node);
    });

    firstNonImportDeclarationNode.insertBefore(t.variableDeclaration('const', [t.variableDeclarator(filenameMap[filename].styleModuleImportMapIdentifier, (0, _createObjectExpression2.default)(t, filenameMap[filename].styleModuleImportMap))]));
    // eslint-disable-next-line
    // console.log('setting up', filename, util.inspect(filenameMap,{depth: 5}))
  };

  const addWebpackHotModuleAccept = path => {
    const test = t.memberExpression(t.identifier('module'), t.identifier('hot'));
    const consequent = t.blockStatement([t.expressionStatement(t.callExpression(t.memberExpression(t.memberExpression(t.identifier('module'), t.identifier('hot')), t.identifier('accept')), [t.stringLiteral(path.node.source.value), t.functionExpression(null, [], t.blockStatement([t.expressionStatement(t.callExpression(t.identifier('require'), [t.stringLiteral(path.node.source.value)]))]))]))]);

    const programPath = path.findParent(parentPath => {
      return parentPath.isProgram();
    });

    const firstNonImportDeclarationNode = programPath.get('body').find(node => {
      return !t.isImportDeclaration(node);
    });

    const hotAcceptStatement = t.ifStatement(test, consequent);

    firstNonImportDeclarationNode.insertBefore(hotAcceptStatement);
  };

const getCssFileIfImportDeclarationExists = (path, stats) => {
        stats.opts.filetypes = stats.opts.filetypes || {};

        const extension = path.node.source.value.lastIndexOf('.') > -1 ? path.node.source.value.substr(path.node.source.value.lastIndexOf('.')) : null;

        if (extension !== '.css' && Object.keys(stats.opts.filetypes).indexOf(extension) < 0) {
          return;
        }

        const filename = stats.file.opts.filename;
        let  targetFileDirectoryPath = (0, _path.dirname)(stats.file.opts.filename);

        if (stats.opts.themePath) {
          const tempTargetFileDirectoryPath = (0, _path.resolve)(stats.opts.themePath, path.node.source.value);
          if (_fs.existsSync(tempTargetFileDirectoryPath)) {
            targetFileDirectoryPath = stats.opts.themePath;
          }
        }

        const targetResourcePath = path.node.source.value.startsWith('.') ? (0, _path.resolve)(targetFileDirectoryPath, path.node.source.value) : require.resolve(path.node.source.value);

        let styleImportName;

        if (path.node.specifiers.length === 0) {
          // eslint-disable-next-line no-process-env
          styleImportName = process.env.NODE_ENV === 'test' ? 'random-test' : 'random-' + Math.random();
        } else if (path.node.specifiers.length === 1) {
          styleImportName = path.node.specifiers[0].local.name;
        } else {
          // eslint-disable-next-line no-console
          console.warn('Please report your use case. https://github.com/gajus/babel-plugin-react-css-modules/issues/new?title=Unexpected+use+case.');

          throw new Error('Unexpected use case.');
        }

        filenameMap[filename].styleModuleImportMap[styleImportName] = (0, _requireCssModule2.default)(targetResourcePath, {
          context: stats.opts.context,
          filetypes: stats.opts.filetypes || {},
          generateScopedName: stats.opts.generateScopedName
        });

        if (stats.opts.webpackHotModuleReloading) {
          addWebpackHotModuleAccept(path);
        }
};

const getCssFileIfAttrStyleNameExists = (path, stats) => {
        const filename = stats.file.opts.filename;
        
        if (_.includes(filesProcessed, filename)) {
            return;
        }

        filesProcessed.push(filename);

        // check if the relative css was imported.
        if (!_.includes(cssImported, `${stats.file.opts.basename}.css`)) {
            throw new Error(`Missing CSS file for this component: ${stats.file.opts.basename}. Please add import ${stats.file.opts.basename}.css somewhere :)`);
        }

        let  targetFileDirectoryPath = (0, _path.dirname)(stats.file.opts.filename);
        
        if (stats.opts.themePath) {
          const tempTargetFileDirectoryPath = (0, _path.resolve)(stats.opts.themePath, `${stats.file.opts.basename}.css`);
          if (_fs.existsSync(tempTargetFileDirectoryPath)) {
            targetFileDirectoryPath = stats.opts.themePath;
          }
        }

        let targetResourcePath = (0, _path.resolve)(targetFileDirectoryPath, `${stats.file.opts.basename}.css`);

        const styleImportName = process.env.NODE_ENV === 'test' ? 'random-test' : 'random-' + Math.random();

        filenameMap[filename].styleModuleImportMap[styleImportName] = (0, _requireCssModule2.default)(targetResourcePath, {
          context: stats.opts.context,
          filetypes: stats.opts.filetypes || {},
          generateScopedName: stats.opts.generateScopedName
        });

        if (stats.opts.webpackHotModuleReloading) {
          addWebpackHotModuleAccept(path);
        }
};

  return {
    inherits: _babelPluginSyntaxJsx2.default,
    visitor: {
      ImportDeclaration(path, stats) {
         const filename = stats.file.opts.basename;
         cssImported.push((0, _path.basename)(path.node.source.value));
        //getCssFileIfImportDeclarationExists(path,stats);
      },
      JSXElement(path, stats) {
        const filename = stats.file.opts.filename;
        const styleNameAttribute = path.node.openingElement.attributes.find(attribute => {
          return typeof attribute.name !== 'undefined' && attribute.name.name === 'styleName';
        });

        if (!styleNameAttribute) {
          return;
        }

        getCssFileIfAttrStyleNameExists(path, stats);

        if (t.isStringLiteral(styleNameAttribute.value)) {
          (0, _resolveStringLiteral2.default)(path, filenameMap[filename].styleModuleImportMap, styleNameAttribute);

          return;
        }

        if (t.isJSXExpressionContainer(styleNameAttribute.value)) {
          if (!filenameMap[filename].importedHelperIndentifier) {
            setupFileForRuntimeResolution(path, filename);
          }
          (0, _replaceJsxExpressionContainer2.default)(t, path, styleNameAttribute, filenameMap[filename].importedHelperIndentifier, filenameMap[filename].styleModuleImportMapIdentifier);
        }
      },
      Program(path, stats) {
        const filename = stats.file.opts.filename;

        filenameMap[filename] = {
          styleModuleImportMap: {}
        };
      }
    }
  };
};
//# sourceMappingURL=index.js.map